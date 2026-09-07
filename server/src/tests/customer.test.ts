import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Customer, Business, BusinessMember, User } from '../modules/index.js'

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

describe('Customers', () => {
  let server: http.Server
  let baseUrl = ''

  before(async () => {
    await connectDatabase(env.mongodbUri)
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
    const email = `cust-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Cust',
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

  test('Unauthenticated requests are rejected', async () => {
    const res = await request('/api/v1/customers', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context Customers')
    const res = await request('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Staff can list customers', async () => {
    const owner = await registerUser('Staff Can List Customers')
    const staffEmail = `staff-can-list-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Staff Listable' },
    })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/customers', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.ok((res.data as ApiSuccessResponse<unknown[]>).data.length > 0)
  })

  test('Staff can create customers', async () => {
    const owner = await registerUser('Staff Can Create Customer')
    const staffEmail = `staff-can-create-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Staff Created', phone: '9812345678' },
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{ name: string; phone?: string }>
    assert.strictEqual(body.data.name, 'Staff Created')
    assert.strictEqual(body.data.phone, '9812345678')
  })

  test('Staff can update customers', async () => {
    const owner = await registerUser('Staff Can Update Customer')
    const staffEmail = `staff-can-update-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updatable Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updated by Staff', phone: '9876543210' },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ name: string; phone?: string }>
    assert.strictEqual(body.data.name, 'Updated by Staff')
    assert.strictEqual(body.data.phone, '9876543210')
  })

  test('Staff cannot deactivate customers', async () => {
    const owner = await registerUser('Staff Cannot Deactivate')
    const staffEmail = `staff-cannot-deactivate-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Cannot Deactivate' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Owner can deactivate customers', async () => {
    const { token, businessId } = await registerUser('Owner Can Deactivate')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Owner Deactivatable' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
    const customer = await Customer.findById(customerId).lean()
    assert.ok(customer)
    assert.strictEqual((customer as unknown as Record<string, unknown>).isActive, false)
  })

  test('Manager can deactivate customers', async () => {
    const owner = await registerUser('Manager Can Deactivate')
    const managerEmail = `manager-deactivate-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Manager Deactivatable' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    const customer = await Customer.findById(customerId).lean()
    assert.ok(customer)
    assert.strictEqual((customer as unknown as Record<string, unknown>).isActive, false)
  })

  test('Customer uses verified businessId', async () => {
    const { token, businessId } = await registerUser('Customer BusinessId Verify')
    const otherBusiness = await Business.create([
      { name: 'Other Biz', slug: `other-${randomUUID()}`, ownerId: new mongoose.Types.ObjectId() },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Verified Biz Customer' },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const customer = await Customer.findById(created.id).lean()
    assert.ok(customer)
    assert.strictEqual(
      String((customer as unknown as Record<string, unknown>).businessId),
      businessId,
    )
    assert.notStrictEqual(
      String((customer as unknown as Record<string, unknown>).businessId),
      otherBusinessId,
    )
  })

  test('Client cannot spoof businessId through request body', async () => {
    const ownerA = await registerUser('Customer Spoof A')
    const ownerB = await registerUser('Customer Spoof B')

    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: { name: 'Spoofed Customer', businessId: ownerB.businessId },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const customer = await Customer.findById(created.id).lean()
    assert.strictEqual(
      String((customer as unknown as Record<string, unknown>).businessId),
      ownerA.businessId,
    )
  })

  test('Business A cannot list Business B customers', async () => {
    const businessA = await registerUser('List Scoped A Customers')
    const businessB = await registerUser('List Scoped B Customers')

    await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Customer A1' },
    })
    await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Customer A2' },
    })
    await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { name: 'Customer B1' },
    })

    const resA = await request('/api/v1/customers', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/customers', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(resA.status, 200)
    assert.strictEqual(resB.status, 200)
    const listA = (resA.data as ApiSuccessResponse<unknown[]>).data
    const listB = (resB.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(listA.length, 2)
    assert.strictEqual(listB.length, 1)
  })

  test('Business A cannot access Business B customer by ID', async () => {
    const businessA = await registerUser('Biz A Read Customer By ID')
    const businessB = await registerUser('Biz B Read Customer By ID')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Secret Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Business A cannot update Business B customer', async () => {
    const businessA = await registerUser('Biz A Update Customer')
    const businessB = await registerUser('Biz B Update Customer')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Update Protected Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { name: 'Hacked Name' },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Business A cannot deactivate Business B customer', async () => {
    const businessA = await registerUser('Biz A Delete Customer')
    const businessB = await registerUser('Biz B Delete Customer')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Delete Protected Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
    const customer = await Customer.findById(customerId).lean()
    assert.ok(customer)
    assert.strictEqual((customer as unknown as Record<string, unknown>).isActive, true)
  })

  test('Invalid customer IDs are rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Customer ID')

    const res = await request(`/api/v1/customers/not-a-valid-id`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_CUSTOMER_ID')
  })

  test('Invalid email is rejected', async () => {
    const { token, businessId } = await registerUser('Invalid Email Customer')

    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Bad Email', email: 'not-an-email' },
    })

    assert.strictEqual(res.status, 400)
  })

  test('Empty names are rejected', async () => {
    const { token, businessId } = await registerUser('Empty Name Customer')

    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: '   ' },
    })

    assert.strictEqual(res.status, 400)
  })

  test('Search remains tenant-scoped', async () => {
    const businessA = await registerUser('Search Scoped A')
    const businessB = await registerUser('Search Scoped B')

    await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Unique Search Name', phone: '1111111111' },
    })
    await request('/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { name: 'Different Search Name', phone: '2222222222' },
    })

    const resA = await request('/api/v1/customers?search=Unique', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/customers?search=Unique', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(resA.status, 200)
    assert.strictEqual(resB.status, 200)
    assert.strictEqual((resA.data as ApiSuccessResponse<unknown[]>).data.length, 1)
    assert.strictEqual((resB.data as ApiSuccessResponse<unknown[]>).data.length, 0)
  })

  test('Inactive customers are excluded by default', async () => {
    const { token, businessId } = await registerUser('Inactive Customer Excluded')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Will Deactivate Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const listRes = await request('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listRes.status, 200)
    const customers = (listRes.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(customers.length, 0)
  })

  test('includeInactive behavior works', async () => {
    const { token, businessId } = await registerUser('Include Inactive Customer')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Inactive Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const listWithoutRes = await request('/api/v1/customers', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listWithoutRes.status, 200)
    assert.strictEqual((listWithoutRes.data as ApiSuccessResponse<unknown[]>).data.length, 0)

    const listWithRes = await request('/api/v1/customers?includeInactive=true', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listWithRes.status, 200)
    assert.strictEqual((listWithRes.data as ApiSuccessResponse<unknown[]>).data.length, 1)
  })

  test('Deactivation does not hard-delete the customer', async () => {
    const { token, businessId } = await registerUser('Soft Delete Verify Customer')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Soft Deleted Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const directCustomer = await Customer.findById(customerId).lean()
    assert.ok(directCustomer, 'Customer record should still exist')
    assert.strictEqual((directCustomer as unknown as Record<string, unknown>).isActive, false)
  })

  test('Customer not found returns 404 for get', async () => {
    const { token, businessId } = await registerUser('Customer Not Found Get')
    const fakeId = new mongoose.Types.ObjectId().toHexString()

    const res = await request(`/api/v1/customers/${fakeId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CUSTOMER_NOT_FOUND')
  })

  test('Customer not found returns 404 for update', async () => {
    const { token, businessId } = await registerUser('Customer Not Found Update')
    const fakeId = new mongoose.Types.ObjectId().toHexString()

    const res = await request(`/api/v1/customers/${fakeId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Ghost' },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CUSTOMER_NOT_FOUND')
  })

  test('Customer not found returns 404 for delete', async () => {
    const { token, businessId } = await registerUser('Customer Not Found Delete')
    const fakeId = new mongoose.Types.ObjectId().toHexString()

    const res = await request(`/api/v1/customers/${fakeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CUSTOMER_NOT_FOUND')
  })

  test('Email is normalized on create', async () => {
    const { token, businessId } = await registerUser('Email Normalized Create')

    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Normalized Email', email: 'RAM@Example.COM' },
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{ email?: string }>
    assert.strictEqual(body.data.email, 'ram@example.com')
  })

  test('Email is normalized on update', async () => {
    const { token, businessId } = await registerUser('Email Normalized Update')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Update Email' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { email: 'UPDATE@Example.COM' },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ email?: string }>
    assert.strictEqual(body.data.email, 'update@example.com')
  })

  test('Empty name is rejected on update', async () => {
    const { token, businessId } = await registerUser('Empty Name Update')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Valid Name' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: '   ' },
    })

    assert.strictEqual(res.status, 400)
  })

  test('Update rejects unknown sensitive fields', async () => {
    const { token, businessId } = await registerUser('Customer Cannot Change BusinessId')
    const otherBusiness = await Business.create([
      {
        name: 'Other Biz',
        slug: `other-cust-biz-${randomUUID()}`,
        ownerId: new mongoose.Types.ObjectId(),
      },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Immutable BusinessId Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { businessId: otherBusinessId },
    })

    assert.strictEqual(res.status, 400)
    const customer = await Customer.findById(customerId).lean()
    assert.ok(customer)
    assert.strictEqual(
      String((customer as unknown as Record<string, unknown>).businessId),
      businessId,
    )
  })

  test('Customer isActive can be updated', async () => {
    const { token, businessId } = await registerUser('Customer IsActive Update')

    const createRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Active Customer' },
    })
    assert.strictEqual(createRes.status, 201)
    const customerId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/customers/${customerId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { isActive: false },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ isActive: boolean }>
    assert.strictEqual(body.data.isActive, false)
  })
})
