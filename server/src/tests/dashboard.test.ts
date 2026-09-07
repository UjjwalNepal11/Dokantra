import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Sale, Business, BusinessMember, User } from '../modules/index.js'

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

describe('Dashboard', () => {
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
    const email = `dash-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Dashboard',
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

  async function createProduct(
    token: string,
    businessId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        name: 'Test Product',
        sku: `PROD-${randomUUID()}`,
        categoryId: undefined,
        description: 'Test',
        sellingPrice: 100,
        costPrice: 80,
        stockQuantity: 0,
        lowStockThreshold: 10,
        unit: 'piece',
        ...overrides,
      },
    })
    assert.strictEqual(res.status, 201)
    return (res.data as ApiSuccessResponse<{ id: string }>).data.id
  }

  async function createSale(
    token: string,
    businessId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        ...overrides,
      },
    })
    assert.strictEqual(res.status, 201)
    return (res.data as ApiSuccessResponse<{ id: string }>).data.id
  }

  async function createExpense(
    token: string,
    businessId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<void> {
    const res = await request('/api/v1/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        category: 'utilities',
        description: 'Test expense',
        amount: 5000,
        paymentMethod: 'cash',
        expenseDate: new Date().toISOString(),
        ...overrides,
      },
    })
    assert.strictEqual(res.status, 201)
  }

  test('Unauthenticated users cannot access dashboard', async () => {
    const { businessId } = await registerUser('Dash Unauthenticated')
    const res = await request('/api/v1/dashboard/summary', {
      headers: { 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Dash Missing Context')
    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Business A cannot see Business B metrics', async () => {
    const businessA = await registerUser('Dash Cross Biz A')
    const businessB = await registerUser('Dash Cross Biz B')

    await createProduct(businessA.token, businessA.businessId, { stockQuantity: 10 })
    await createSale(businessA.token, businessA.businessId)
    await createExpense(businessA.token, businessA.businessId, { amount: 1000 })
    await createProduct(businessB.token, businessB.businessId, { stockQuantity: 10 })
    await createSale(businessB.token, businessB.businessId)
    await createExpense(businessB.token, businessB.businessId, { amount: 5000 })

    const resA = await request('/api/v1/dashboard/summary', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    assert.strictEqual(resA.status, 200)
    const dataA = (resA.data as ApiSuccessResponse<Record<string, number>>).data

    const resB = await request('/api/v1/dashboard/summary', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })
    assert.strictEqual(resB.status, 200)
    const dataB = (resB.data as ApiSuccessResponse<Record<string, number>>).data

    assert.strictEqual(dataA.totalOrders, 1)
    assert.strictEqual(dataB.totalOrders, 1)
    assert.strictEqual(dataA.totalExpenses, 1000)
    assert.strictEqual(dataB.totalExpenses, 5000)
  })

  test('Completed sales are included in dashboard', async () => {
    const { token, businessId } = await registerUser('Dash Completed Sales')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 1)
  })

  test('Cancelled sales are excluded from dashboard', async () => {
    const { token, businessId } = await registerUser('Dash Cancelled Sales')
    await createProduct(token, businessId, { stockQuantity: 10 })
    const saleId = await createSale(token, businessId)
    await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 0)
    assert.strictEqual(data.totalRevenue, 0)
  })

  test('Revenue calculation is correct', async () => {
    const { token, businessId } = await registerUser('Dash Revenue')
    await createProduct(token, businessId, { stockQuantity: 10, sellingPrice: 100 })
    await createSale(token, businessId)
    await createSale(token, businessId)

    const summaryRes = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(summaryRes.status, 200)
    const data = (summaryRes.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 2)
    assert.ok(data.totalRevenue > 0)
  })

  test('Expense calculation is correct', async () => {
    const { token, businessId } = await registerUser('Dash Expense')
    await createExpense(token, businessId, { amount: 2500 })
    await createExpense(token, businessId, { amount: 3500 })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalExpenses, 6000)
  })

  test('Estimated profit calculation is correct', async () => {
    const { token, businessId } = await registerUser('Dash Profit')
    await createProduct(token, businessId, { stockQuantity: 10, sellingPrice: 100 })
    await createSale(token, businessId)
    await createExpense(token, businessId, { amount: 1000 })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.estimatedProfit, data.totalRevenue - data.totalExpenses)
  })

  test('Date filtering works', async () => {
    const { token, businessId } = await registerUser('Dash Date Filter')
    await createProduct(token, businessId, { stockQuantity: 10 })
    const saleId = await createSale(token, businessId)

    const sale = await Sale.findById(saleId).lean()
    assert.ok(sale)
    const soldAt = (sale as unknown as Record<string, unknown>).soldAt as Date
    const dateStr = soldAt.toISOString().split('T')[0]

    const res = await request(`/api/v1/dashboard/summary?startDate=${dateStr}&endDate=${dateStr}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 1)
  })

  test('Invalid date range is rejected', async () => {
    const { token, businessId } = await registerUser('Dash Invalid Date')
    const res = await request('/api/v1/dashboard/summary?startDate=2026-08-30&endDate=2026-08-01', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_DATE_RANGE')
  })

  test('Empty date range returns zero/empty results', async () => {
    const { token, businessId } = await registerUser('Dash Empty Date')
    const res = await request('/api/v1/dashboard/summary?startDate=2020-01-01&endDate=2020-01-31', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 0)
    assert.strictEqual(data.totalRevenue, 0)
    assert.strictEqual(data.totalExpenses, 0)
    assert.strictEqual(data.estimatedProfit, 0)
  })

  test('Low-stock count is correct', async () => {
    const { token, businessId } = await registerUser('Dash Low Stock')
    await createProduct(token, businessId, { stockQuantity: 2, lowStockThreshold: 5 })
    await createProduct(token, businessId, { stockQuantity: 10, lowStockThreshold: 5 })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.lowStockProducts, 1)
  })

  test('Inactive products are excluded from low-stock count', async () => {
    const { token, businessId } = await registerUser('Dash Inactive Low Stock')
    const productId = await createProduct(token, businessId, {
      stockQuantity: 2,
      lowStockThreshold: 5,
    })
    await request(`/api/v1/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.lowStockProducts, 0)
  })

  test('Staff financial metrics are hidden', async () => {
    const owner = await registerUser('Dash Staff Financial')
    const staffEmail = `staff-financial-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })
    await createSale(owner.token, owner.businessId)
    await createExpense(owner.token, owner.businessId, { amount: 1000 })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalRevenue, 0)
    assert.strictEqual(data.totalExpenses, 0)
    assert.strictEqual(data.estimatedProfit, 0)
    assert.strictEqual(data.totalOrders, 1)
    assert.ok(data.totalProducts >= 1)
  })

  test('Manager can access full dashboard', async () => {
    const owner = await registerUser('Dash Manager Full')
    const managerEmail = `manager-full-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })
    await createSale(owner.token, owner.businessId)
    await createExpense(owner.token, owner.businessId, { amount: 1000 })

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.ok(data.totalRevenue > 0)
    assert.ok(data.totalExpenses > 0)
  })

  test('Owner can access full dashboard', async () => {
    const { token, businessId } = await registerUser('Dash Owner Full')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)
    await createExpense(token, businessId, { amount: 1000 })

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.ok(data.totalRevenue > 0)
    assert.ok(data.totalExpenses > 0)
  })

  test('Default date range covers current month', async () => {
    const { token, businessId } = await registerUser('Dash Default Range')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)

    const res = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<Record<string, number>>).data
    assert.strictEqual(data.totalOrders, 1)
  })
})
