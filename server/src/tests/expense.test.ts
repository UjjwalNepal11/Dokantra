import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Expense, Business, BusinessMember, User } from '../modules/index.js'

type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

describe('Expenses', () => {
  let server: http.Server
  let baseUrl = ''

  before(async () => {
    await connectDatabase(env.mongodbUri)
    env.rateLimitWindowMs = 60 * 1000
    env.rateLimitMaxRequests = 1000
    const app = createApp()
    server = await new Promise<http.Server>((resolve) => {
      const srv = app.listen(0, () => resolve(srv))
    })
    const address = server.address() as unknown as { port: number }
    baseUrl = `http://localhost:${address.port}`
  })

  after(async () => {
    await new Promise<void>((resolve) => {
      if (!server.listening) {
        resolve()
        return
      }
      server.close(() => resolve())
    })
    await disconnectDatabase()
  })

  async function request(
    path: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: unknown
    } = {},
  ): Promise<{ status: number; headers: Record<string, string | string[]>; data: unknown }> {
    const url = new URL(path, baseUrl)
    const payload = options.body ? JSON.stringify(options.body) : undefined
    const allHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: options.method ?? 'GET',
          headers: allHeaders,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            let parsed: unknown
            try {
              parsed = data ? JSON.parse(data) : null
            } catch {
              parsed = data
            }
            const headers: Record<string, string | string[]> = {}
            for (const [key, value] of Object.entries(res.headers)) {
              headers[key] = value as string | string[]
            }
            resolve({ status: res.statusCode ?? 500, headers, data: parsed })
          })
        },
      )

      req.setTimeout(10000, () => {
        req.destroy(new Error(`Request timed out: ${options.method ?? 'GET'} ${path}`))
      })
      req.on('error', reject)
      if (payload) {
        req.write(payload)
      }
      req.end()
    })
  }

  async function registerUser(businessName: string): Promise<{
    token: string
    userId: string
    businessId: string
    membershipId: string
  }> {
    const email = `expense-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Expense',
        lastName: 'Test',
        email,
        password: 'password123',
        businessName,
      },
    })

    assert.strictEqual(res.status, 201)
    const successData = res.data as ApiSuccessResponse<{
      user: { id: string }
      accessToken: string
    }>
    const token = successData.data.accessToken
    const user = successData.data.user

    const business = await Business.findOne({ ownerId: user.id }).lean()
    assert.ok(business, 'Business should exist after registration')
    const businessId = String((business as unknown as Record<string, unknown>)._id)

    const member = await BusinessMember.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
      businessId: new mongoose.Types.ObjectId(businessId),
    }).lean()
    assert.ok(member, 'Membership should exist after registration')
    const membershipId = String((member as unknown as Record<string, unknown>)._id)

    return { token, userId: user.id, businessId, membershipId }
  }

  async function createUser(email: string, password: string): Promise<string> {
    const passwordHash = await import('../lib/password.js').then((m) => m.hashPassword(password))
    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email,
      passwordHash,
    })
    return user._id.toString()
  }

  async function addMember(
    userId: string,
    businessId: string,
    role: 'owner' | 'manager' | 'staff',
    status: 'active' | 'inactive' = 'active',
  ): Promise<string> {
    const member = await BusinessMember.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: new mongoose.Types.ObjectId(userId),
      role,
      status,
    })
    return member._id.toString()
  }

  async function loginAs(email: string, password: string): Promise<string> {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    assert.strictEqual(res.status, 200)
    const successData = res.data as ApiSuccessResponse<{ accessToken: string }>
    return successData.data.accessToken
  }

  async function createExpense(
    token: string,
    businessId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<{ data: { id: string } | null; status: number }> {
    const body = {
      category: 'utilities',
      description: 'Electricity bill for August',
      amount: 5000,
      expenseDate: '2026-08-28',
      paymentMethod: 'cash',
      ...overrides,
    }

    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body,
    })

    return {
      data: (res.data as ApiSuccessResponse<{ id: string }>).data ?? null,
      status: res.status,
    }
  }

  test('1. Unauthenticated requests are rejected', async () => {
    const res = await request('/api/v1/expenses', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('2. Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context')
    const res = await request('/api/v1/expenses', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('3. Staff cannot list expenses', async () => {
    const owner = await registerUser('Staff Cannot List')
    const staffEmail = `staff-cannot-list-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/expenses', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('4. Staff cannot create expenses', async () => {
    const owner = await registerUser('Staff Cannot Create')
    const staffEmail = `staff-cannot-create-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: {
        category: 'utilities',
        description: 'Electricity bill',
        amount: 5000,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('5. Manager can list expenses', async () => {
    const owner = await registerUser('Manager Can List')
    const managerEmail = `manager-can-list-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    await createExpense(owner.token, owner.businessId)

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/expenses', {
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray((res.data as ApiSuccessResponse<unknown[]>).data))
  })

  test('6. Manager can create expenses', async () => {
    const owner = await registerUser('Manager Can Create')
    const managerEmail = `manager-can-create-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: {
        category: 'supplies',
        description: 'Office supplies',
        amount: 2000,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{ id: string }>
    assert.ok(body.data.id)
  })

  test('7. Manager can update expenses', async () => {
    const owner = await registerUser('Manager Can Update')
    const managerEmail = `manager-can-update-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const { data: createRes } = await createExpense(owner.token, owner.businessId)
    const expenseId = (createRes as { id: string }).id

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { description: 'Updated description' },
    })
    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ description: string }>
    assert.strictEqual(body.data.description, 'Updated description')
  })

  test('8. Manager cannot delete expenses (owner-only)', async () => {
    const owner = await registerUser('Manager Cannot Delete')
    const managerEmail = `manager-cannot-delete-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const { data: createRes } = await createExpense(owner.token, owner.businessId)
    const expenseId = (createRes as { id: string }).id

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('9. Owner can delete expenses', async () => {
    const { token, businessId } = await registerUser('Owner Can Delete')
    const { data: createRes } = await createExpense(token, businessId)
    const expenseId = (createRes as { id: string }).id

    const res = await request(`/api/v1/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)

    const getRes = await request(`/api/v1/expenses/${expenseId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(getRes.status, 404)
  })

  test('10. Expense uses verified businessId', async () => {
    const { token, businessId } = await registerUser('Verified BusinessId')
    const { data: createRes } = await createExpense(token, businessId)
    const expenseId = (createRes as { id: string }).id

    const expense = await Expense.findById(expenseId).lean()
    assert.ok(expense)
    assert.strictEqual(
      String((expense as unknown as Record<string, unknown>).businessId),
      businessId,
    )
  })

  test('11. Expense uses authenticated user as createdBy', async () => {
    const { token, userId, businessId } = await registerUser('CreatedBy Verify')
    const { data: createRes } = await createExpense(token, businessId)
    const expenseId = (createRes as { id: string }).id

    const expense = await Expense.findById(expenseId).lean()
    assert.ok(expense)
    assert.strictEqual(String((expense as unknown as Record<string, unknown>).createdBy), userId)
  })

  test('12. Client cannot spoof businessId', async () => {
    const ownerA = await registerUser('Spoof A')
    const ownerB = await registerUser('Spoof B')

    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: {
        category: 'utilities',
        description: 'Spoofed',
        amount: 1000,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
        businessId: ownerB.businessId,
      },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const expense = await Expense.findById(created.id).lean()
    assert.strictEqual(
      String((expense as unknown as Record<string, unknown>).businessId),
      ownerA.businessId,
    )
  })

  test('13. Client cannot spoof createdBy', async () => {
    const ownerA = await registerUser('Spoof CreatedBy A')
    const ownerB = await registerUser('Spoof CreatedBy B')

    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: {
        category: 'utilities',
        description: 'Spoofed createdBy',
        amount: 1000,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
        createdBy: ownerB.userId,
      },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const expense = await Expense.findById(created.id).lean()
    assert.strictEqual(
      String((expense as unknown as Record<string, unknown>).createdBy),
      ownerA.userId,
    )
  })

  test('14. Business A cannot list Business B expenses', async () => {
    const businessA = await registerUser('List Scoped A')
    const businessB = await registerUser('List Scoped B')

    await createExpense(businessA.token, businessA.businessId)
    await createExpense(businessB.token, businessB.businessId)

    const res = await request('/api/v1/expenses', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    assert.strictEqual(res.status, 403)
  })

  test('15. Business A cannot access Business B expense by ID', async () => {
    const businessA = await registerUser('Access By ID A')
    const businessB = await registerUser('Access By ID B')

    const { data: createResA } = await createExpense(businessA.token, businessA.businessId)
    const expenseIdA = (createResA as { id: string }).id

    const res = await request(`/api/v1/expenses/${expenseIdA}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })
    assert.strictEqual(res.status, 404)
  })

  test('16. Business A cannot update Business B expense', async () => {
    const businessA = await registerUser('Update Scoped A')
    const businessB = await registerUser('Update Scoped B')

    const { data: createResA } = await createExpense(businessA.token, businessA.businessId)
    const expenseIdA = (createResA as { id: string }).id

    const res = await request(`/api/v1/expenses/${expenseIdA}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { description: 'Hacked' },
    })
    assert.strictEqual(res.status, 404)
  })

  test('17. Business A cannot delete Business B expense', async () => {
    const businessA = await registerUser('Delete Scoped A')
    const businessB = await registerUser('Delete Scoped B')

    const { data: createResA } = await createExpense(businessA.token, businessA.businessId)
    const expenseIdA = (createResA as { id: string }).id

    const res = await request(`/api/v1/expenses/${expenseIdA}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })
    assert.strictEqual(res.status, 404)
  })

  test('18. Zero amount is rejected', async () => {
    const { token, businessId } = await registerUser('Zero Amount')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'utilities',
        description: 'Zero amount',
        amount: 0,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR')
  })

  test('19. Negative amount is rejected', async () => {
    const { token, businessId } = await registerUser('Negative Amount')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'utilities',
        description: 'Negative amount',
        amount: -100,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR')
  })

  test('20. Invalid category is rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Category')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'invalid_category',
        description: 'Test',
        amount: 1000,
        expenseDate: '2026-08-28',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR')
  })

  test('21. Invalid payment method is rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Payment Method')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'utilities',
        description: 'Test',
        amount: 1000,
        expenseDate: '2026-08-28',
        paymentMethod: 'invalid_method',
      },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR')
  })

  test('22. Invalid dates are rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Dates')
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'utilities',
        description: 'Test',
        amount: 1000,
        expenseDate: 'not-a-date',
        paymentMethod: 'cash',
      },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR')
  })

  test('23. Date filtering works', async () => {
    const { token, businessId } = await registerUser('Date Filtering')
    await createExpense(token, businessId, { expenseDate: '2026-08-15' })
    await createExpense(token, businessId, { expenseDate: '2026-08-20' })
    await createExpense(token, businessId, { expenseDate: '2026-08-25' })

    const res = await request('/api/v1/expenses?startDate=2026-08-15&endDate=2026-08-20', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const expenses = (res.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(expenses.length, 2)
  })

  test('24. Invalid date ranges are rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Date Range')
    const res = await request('/api/v1/expenses?startDate=2026-08-31&endDate=2026-08-01', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_DATE_RANGE')
  })

  test('25. Pagination follows existing API conventions', async () => {
    const { token, businessId } = await registerUser('Pagination Test')
    for (let i = 0; i < 5; i++) {
      await createExpense(token, businessId, { description: `Expense ${i}` })
    }

    const res = await request('/api/v1/expenses?page=1&limit=2', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray((res.data as ApiSuccessResponse<unknown[]>).data))
  })

  test('26. Deletion behavior matches documented strategy (hard delete)', async () => {
    const { token, businessId } = await registerUser('Hard Delete Test')
    const { data: createRes } = await createExpense(token, businessId)
    const expenseId = (createRes as { id: string }).id

    const res = await request(`/api/v1/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)

    const deletedExpense = await Expense.findById(expenseId).lean()
    assert.strictEqual(deletedExpense, null)
  })
})
