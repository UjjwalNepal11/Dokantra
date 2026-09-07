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

describe('Reports', () => {
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
    const email = `reports-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Reports',
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

  async function createCustomer(
    token: string,
    businessId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        name: 'Test Customer',
        phone: '9812345678',
        email: `cust-${randomUUID()}@example.com`,
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

  test('Sales trend requires authentication', async () => {
    const { businessId } = await registerUser('Reports Sales Auth')
    const res = await request(`/api/v1/reports/sales?businessId=${businessId}`)
    assert.strictEqual(res.status, 401)
  })

  test('Sales trend requires business context', async () => {
    const { token } = await registerUser('Reports Sales Context')
    const res = await request('/api/v1/reports/sales', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Sales trend aggregation is correct', async () => {
    const { token, businessId } = await registerUser('Reports Sales Trend')
    await createProduct(token, businessId, { stockQuantity: 10, sellingPrice: 100 })
    await createSale(token, businessId)
    await createSale(token, businessId)

    const res = await request('/api/v1/reports/sales', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (
      res.data as ApiSuccessResponse<{ data: Array<{ orders: number; revenue: number }> }>
    ).data
    assert.ok(data.data.length >= 1)
    const totalOrders = data.data.reduce((sum, point) => sum + point.orders, 0)
    assert.strictEqual(totalOrders, 2)
  })

  test('Sales trend date filtering works', async () => {
    const { token, businessId } = await registerUser('Reports Sales Trend Date')
    await createProduct(token, businessId, { stockQuantity: 10, sellingPrice: 100 })
    const saleId = await createSale(token, businessId)
    const sale = await Sale.findById(saleId).lean()
    assert.ok(sale)
    const soldAt = (sale as unknown as Record<string, unknown>).soldAt as Date
    const dateStr = soldAt.toISOString().split('T')[0]

    const res = await request(`/api/v1/reports/sales?startDate=${dateStr}&endDate=${dateStr}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: Array<{ orders: number }> }>).data
    const totalOrders = data.data.reduce((sum, point) => sum + point.orders, 0)
    assert.strictEqual(totalOrders, 1)
  })

  test('Sales trend groupBy=week works', async () => {
    const { token, businessId } = await registerUser('Reports Sales Week')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)

    const res = await request('/api/v1/reports/sales?groupBy=week', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: unknown[] }>).data
    assert.ok(data.data.length >= 1)
  })

  test('Sales trend groupBy=month works', async () => {
    const { token, businessId } = await registerUser('Reports Sales Month')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)

    const res = await request('/api/v1/reports/sales?groupBy=month', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: unknown[] }>).data
    assert.ok(data.data.length >= 1)
  })

  test('Expense report aggregation is correct', async () => {
    const { token, businessId } = await registerUser('Reports Expense Agg')
    await createExpense(token, businessId, { amount: 3000, category: 'utilities' })
    await createExpense(token, businessId, { amount: 2000, category: 'rent' })

    const res = await request('/api/v1/reports/expenses', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (
      res.data as ApiSuccessResponse<{ total: number; count: number; byCategory: unknown[] }>
    ).data
    assert.strictEqual(data.total, 5000)
    assert.strictEqual(data.count, 2)
    assert.ok(data.byCategory.length >= 2)
  })

  test('Expense report date filtering works', async () => {
    const { token, businessId } = await registerUser('Reports Expense Date')
    await createExpense(token, businessId, { amount: 1000 })

    const today = new Date().toISOString().split('T')[0]
    const res = await request(`/api/v1/reports/expenses?startDate=${today}&endDate=${today}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ total: number }>).data
    assert.strictEqual(data.total, 1000)
  })

  test('Top products aggregation is correct', async () => {
    const { token, businessId } = await registerUser('Reports Top Products')
    await createProduct(token, businessId, {
      name: 'Product A',
      sku: 'A',
      stockQuantity: 10,
      sellingPrice: 100,
    })
    await createSale(token, businessId)

    const res = await request('/api/v1/reports/top-products', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (
      res.data as ApiSuccessResponse<{ data: Array<{ productId: string; quantitySold: number }> }>
    ).data
    assert.ok(data.data.length >= 1)
    assert.ok(data.data[0].quantitySold >= 2)
  })

  test('Top products limit works', async () => {
    const { token, businessId } = await registerUser('Reports Top Products Limit')
    await createProduct(token, businessId, { name: 'Product A', sku: 'A', stockQuantity: 10 })
    await createSale(token, businessId)

    const res = await request('/api/v1/reports/top-products?limit=5', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: unknown[] }>).data
    assert.ok(data.data.length <= 5)
  })

  test('Low stock report returns correct products', async () => {
    const { token, businessId } = await registerUser('Reports Low Stock')
    await createProduct(token, businessId, {
      name: 'Low Stock Product',
      sku: 'LOW',
      stockQuantity: 1,
      lowStockThreshold: 5,
    })
    await createProduct(token, businessId, {
      name: 'Normal Product',
      sku: 'NORM',
      stockQuantity: 20,
      lowStockThreshold: 5,
    })

    const res = await request('/api/v1/reports/low-stock', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: Array<{ sku: string }> }>).data
    assert.strictEqual(data.data.length, 1)
    assert.strictEqual(data.data[0].sku, 'LOW')
  })

  test('Customer report is business-scoped', async () => {
    const businessA = await registerUser('Reports Customers Biz A')
    const businessB = await registerUser('Reports Customers Biz B')

    await createCustomer(businessA.token, businessA.businessId)
    await createCustomer(businessB.token, businessB.businessId)

    const resA = await request('/api/v1/reports/customers', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    assert.strictEqual(resA.status, 200)
    const dataA = (resA.data as ApiSuccessResponse<{ total: number }>).data
    assert.strictEqual(dataA.total, 1)

    const resB = await request('/api/v1/reports/customers', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })
    assert.strictEqual(resB.status, 200)
    const dataB = (resB.data as ApiSuccessResponse<{ total: number }>).data
    assert.strictEqual(dataB.total, 1)
  })

  test('Customer report with sales in period works', async () => {
    const { token, businessId } = await registerUser('Reports Customers With Sales')
    const customerId = await createCustomer(token, businessId)
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId, { customerId })

    const res = await request('/api/v1/reports/customers', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ withSalesInPeriod: number }>).data
    assert.strictEqual(data.withSalesInPeriod, 1)
  })

  test('Staff cannot access sales trend report', async () => {
    const owner = await registerUser('Reports Staff Sales')
    const staffEmail = `staff-sales-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/reports/sales', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 403)
  })

  test('Staff cannot access expense report', async () => {
    const owner = await registerUser('Reports Staff Expense')
    const staffEmail = `staff-expense-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/reports/expenses', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 403)
  })

  test('Staff can access low-stock report', async () => {
    const owner = await registerUser('Reports Staff LowStock')
    const staffEmail = `staff-lowstock-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')
    await createProduct(owner.token, owner.businessId, { stockQuantity: 1, lowStockThreshold: 5 })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/reports/low-stock', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: unknown[] }>).data
    assert.strictEqual(data.data.length, 1)
  })

  test('Manager can access sales trend', async () => {
    const owner = await registerUser('Reports Manager Sales')
    const managerEmail = `manager-sales-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')
    await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })
    await createSale(owner.token, owner.businessId)

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/reports/sales', {
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })
    assert.strictEqual(res.status, 200)
  })

  test('Owner can access all reports', async () => {
    const { token, businessId } = await registerUser('Reports Owner All')
    await createProduct(token, businessId, { stockQuantity: 10 })
    await createSale(token, businessId)
    await createExpense(token, businessId, { amount: 1000 })

    const endpoints = [
      '/api/v1/reports/sales',
      '/api/v1/reports/expenses',
      '/api/v1/reports/top-products',
      '/api/v1/reports/low-stock',
      '/api/v1/reports/customers',
    ]

    for (const endpoint of endpoints) {
      const res = await request(endpoint, {
        headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      })
      assert.strictEqual(res.status, 200, `Expected 200 for ${endpoint}, got ${res.status}`)
    }
  })

  test('Invalid date range is rejected for reports', async () => {
    const { token, businessId } = await registerUser('Reports Invalid Date')
    const res = await request('/api/v1/reports/sales?startDate=2026-08-30&endDate=2026-08-01', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_DATE_RANGE')
  })

  test('Empty date range returns zero/empty results for reports', async () => {
    const { token, businessId } = await registerUser('Reports Empty Date')
    const res = await request('/api/v1/reports/sales?startDate=2020-01-01&endDate=2020-01-31', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
    const data = (res.data as ApiSuccessResponse<{ data: Array<{ orders: number }> }>).data
    assert.strictEqual(data.data.length, 0)
  })
})
