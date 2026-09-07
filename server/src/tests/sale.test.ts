import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import {
  Product,
  Sale,
  InventoryMovement,
  Business,
  BusinessMember,
  User,
} from '../modules/index.js'

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

describe('Sales', () => {
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
    const email = `sale-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Sale',
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

  test('Unauthenticated users cannot access sales', async () => {
    const res = await request('/api/v1/sales', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context Sales')
    const res = await request('/api/v1/sales', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Staff can create sales', async () => {
    const owner = await registerUser('Staff Can Create Sales')
    const staffEmail = `staff-can-create-sales-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
  })

  test('Owner can create sales', async () => {
    const { token, businessId } = await registerUser('Owner Can Create Sales')
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
      },
    })

    assert.strictEqual(res.status, 201)
  })

  test('Manager can create sales', async () => {
    const owner = await registerUser('Manager Can Create Sales')
    const managerEmail = `manager-can-create-sales-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
  })

  test('Sale uses verified businessId', async () => {
    const owner = await registerUser('Sale BusinessId Verify')
    const otherBusiness = await Business.create([
      {
        name: 'Other Biz Sales',
        slug: `other-sales-${randomUUID()}`,
        ownerId: new mongoose.Types.ObjectId(),
      },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const sale = await Sale.findById(created.id).lean()
    assert.ok(sale)
    assert.strictEqual(
      String((sale as unknown as Record<string, unknown>).businessId),
      owner.businessId,
    )
    assert.notStrictEqual(
      String((sale as unknown as Record<string, unknown>).businessId),
      otherBusinessId,
    )
  })

  test('Client cannot spoof businessId through request body', async () => {
    const ownerA = await registerUser('Spoof Sale A')
    const ownerB = await registerUser('Spoof Sale B')

    const productId = await createProduct(ownerA.token, ownerA.businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        businessId: ownerB.businessId,
      },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const sale = await Sale.findById(created.id).lean()
    assert.ok(sale)
    assert.strictEqual(
      String((sale as unknown as Record<string, unknown>).businessId),
      ownerA.businessId,
    )
  })

  test('Walk-in sale works without customerId', async () => {
    const { token, businessId } = await registerUser('Walk-in Sale')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (res.data as ApiSuccessResponse<{ customerId?: string }>).data
    assert.strictEqual(sale.customerId, undefined)
  })

  test('Customer from another business is rejected', async () => {
    const businessA = await registerUser('Cross Business Customer A')
    const businessB = await registerUser('Cross Business Customer B')

    const productId = await createProduct(businessA.token, businessA.businessId, {
      stockQuantity: 10,
    })
    const customerId = await createCustomer(businessB.token, businessB.businessId)

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: {
        customerId,
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CUSTOMER_NOT_FOUND')
  })

  test('Inactive customer is rejected', async () => {
    const { token, businessId } = await registerUser('Inactive Customer Sale')
    const customerId = await createCustomer(token, businessId)
    await request(`/api/v1/customers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        customerId,
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CUSTOMER_NOT_FOUND')
  })

  test('Product from another business is rejected', async () => {
    const businessA = await registerUser('Cross Business Product A')
    const businessB = await registerUser('Cross Business Product B')

    const productId = await createProduct(businessB.token, businessB.businessId, {
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'PRODUCT_NOT_FOUND')
  })

  test('Inactive product is rejected', async () => {
    const { token, businessId } = await registerUser('Inactive Product Sale')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    await request(`/api/v1/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'PRODUCT_NOT_FOUND')
  })

  test('Insufficient stock rejects entire sale', async () => {
    const { token, businessId } = await registerUser('Insufficient Stock Sale')
    const productId = await createProduct(token, businessId, { stockQuantity: 5 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 10 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INSUFFICIENT_STOCK')
  })

  test('Successful sale reduces stock correctly', async () => {
    const { token, businessId } = await registerUser('Sale Reduces Stock')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 7)
  })

  test('Successful sale creates Sale record', async () => {
    const { token, businessId } = await registerUser('Sale Creates Record')
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
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id
    const sale = await Sale.findById(saleId).lean()
    assert.ok(sale)
    assert.strictEqual((sale as unknown as Record<string, unknown>).status, 'completed')
  })

  test('Successful sale creates InventoryMovement for every item', async () => {
    const { token, businessId } = await registerUser('Sale Creates Movements')
    const productA = await createProduct(token, businessId, {
      name: 'Product A',
      sku: 'A',
      stockQuantity: 10,
    })
    const productB = await createProduct(token, businessId, {
      name: 'Product B',
      sku: 'B',
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [
          { productId: productA, quantity: 2 },
          { productId: productB, quantity: 3 },
        ],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id

    const movements = await InventoryMovement.find({
      referenceType: 'sale',
      referenceId: new mongoose.Types.ObjectId(saleId),
    }).lean()
    assert.strictEqual(movements.length, 2)
  })

  test('Sale movements contain correct previousQuantity', async () => {
    const { token, businessId } = await registerUser('Sale Movement Previous Quantity')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id

    const movements = await InventoryMovement.find({
      referenceType: 'sale',
      referenceId: new mongoose.Types.ObjectId(saleId),
    }).lean()
    assert.strictEqual(movements.length, 1)
    assert.strictEqual(movements[0].previousQuantity, 10)
  })

  test('Sale movements contain correct newQuantity', async () => {
    const { token, businessId } = await registerUser('Sale Movement New Quantity')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id

    const movements = await InventoryMovement.find({
      referenceType: 'sale',
      referenceId: new mongoose.Types.ObjectId(saleId),
    }).lean()
    assert.strictEqual(movements.length, 1)
    assert.strictEqual(movements[0].newQuantity, 7)
  })

  test('Inventory movement quantity is negative for sales', async () => {
    const { token, businessId } = await registerUser('Sale Movement Negative Quantity')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id

    const movements = await InventoryMovement.find({
      referenceType: 'sale',
      referenceId: new mongoose.Types.ObjectId(saleId),
    }).lean()
    assert.strictEqual(movements.length, 1)
    assert.strictEqual(movements[0].quantity, -3)
  })

  test('Server ignores client-provided prices', async () => {
    const { token, businessId } = await registerUser('Ignore Client Prices')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      costPrice: 80,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 2, unitPrice: 999, unitCost: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (
      res.data as ApiSuccessResponse<{
        items: { unitPrice: number; unitCost: number; subtotal: number }[]
      }>
    ).data
    assert.strictEqual(sale.items[0].unitPrice, 100)
    assert.strictEqual(sale.items[0].unitCost, 80)
    assert.strictEqual(sale.items[0].subtotal, 200)
  })

  test('Server calculates item subtotals correctly', async () => {
    const { token, businessId } = await registerUser('Item Subtotal Calculation')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 3 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (
      res.data as ApiSuccessResponse<{
        items: { subtotal: number }[]
        subtotal: number
      }>
    ).data
    assert.strictEqual(sale.items[0].subtotal, 300)
    assert.strictEqual(sale.subtotal, 300)
  })

  test('Server calculates sale subtotal correctly', async () => {
    const { token, businessId } = await registerUser('Sale Subtotal Calculation')
    const productA = await createProduct(token, businessId, {
      name: 'Product A',
      sku: 'A',
      sellingPrice: 100,
      stockQuantity: 10,
    })
    const productB = await createProduct(token, businessId, {
      name: 'Product B',
      sku: 'B',
      sellingPrice: 50,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [
          { productId: productA, quantity: 2 },
          { productId: productB, quantity: 1 },
        ],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (res.data as ApiSuccessResponse<{ subtotal: number }>).data
    assert.strictEqual(sale.subtotal, 250)
  })

  test('Discount calculation works', async () => {
    const { token, businessId } = await registerUser('Discount Calculation')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 50,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (
      res.data as ApiSuccessResponse<{ subtotal: number; discount: number; total: number }>
    ).data
    assert.strictEqual(sale.subtotal, 200)
    assert.strictEqual(sale.discount, 50)
    assert.strictEqual(sale.total, 150)
  })

  test('Tax calculation works', async () => {
    const { token, businessId } = await registerUser('Tax Calculation')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 0,
        tax: 20,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (res.data as ApiSuccessResponse<{ subtotal: number; tax: number; total: number }>)
      .data
    assert.strictEqual(sale.subtotal, 200)
    assert.strictEqual(sale.tax, 20)
    assert.strictEqual(sale.total, 220)
  })

  test('Total calculation works', async () => {
    const { token, businessId } = await registerUser('Total Calculation')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 2 }],
        discount: 20,
        tax: 10,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (
      res.data as ApiSuccessResponse<{
        subtotal: number
        discount: number
        tax: number
        total: number
      }>
    ).data
    assert.strictEqual(sale.subtotal, 200)
    assert.strictEqual(sale.discount, 20)
    assert.strictEqual(sale.tax, 10)
    assert.strictEqual(sale.total, 190)
  })

  test('Discount cannot exceed subtotal', async () => {
    const { token, businessId } = await registerUser('Discount Exceeds Subtotal')
    const productId = await createProduct(token, businessId, {
      sellingPrice: 100,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 200,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_DISCOUNT')
  })

  test('Duplicate products are safely handled', async () => {
    const { token, businessId } = await registerUser('Duplicate Products Sale')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [
          { productId, quantity: 3 },
          { productId, quantity: 2 },
        ],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const sale = (
      res.data as ApiSuccessResponse<{ items: { quantity: number; subtotal: number }[] }>
    ).data
    assert.strictEqual(sale.items.length, 1)
    assert.strictEqual(sale.items[0].quantity, 5)
    assert.strictEqual(sale.items[0].subtotal, 500)

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 5)
  })

  test('Product historical snapshots are preserved', async () => {
    const { token, businessId } = await registerUser('Historical Snapshots')
    const productId = await createProduct(token, businessId, {
      name: 'Original Name',
      sku: 'ORIG-SKU',
      sellingPrice: 100,
      costPrice: 80,
      stockQuantity: 10,
    })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 201)
    const saleId = (res.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Updated Name', sku: 'UPD-SKU', sellingPrice: 200, costPrice: 150 },
    })

    const sale = await Sale.findById(saleId).lean()
    assert.ok(sale)
    const items = (sale as unknown as Record<string, unknown>).items as unknown[]
    assert.strictEqual((items[0] as Record<string, unknown>).productName, 'Original Name')
    assert.strictEqual((items[0] as Record<string, unknown>).sku, 'ORIG-SKU')
    assert.strictEqual((items[0] as Record<string, unknown>).unitPrice, 100)
    assert.strictEqual((items[0] as Record<string, unknown>).unitCost, 80)
  })

  test('Invoice numbers are unique within a business', async () => {
    const { token, businessId } = await registerUser('Invoice Uniqueness')
    const productId = await createProduct(token, businessId, { stockQuantity: 20 })

    const res1 = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })
    assert.strictEqual(res1.status, 201)
    const invoice1 = (res1.data as ApiSuccessResponse<{ invoiceNumber: string }>).data.invoiceNumber

    const res2 = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [{ productId, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })
    assert.strictEqual(res2.status, 201)
    const invoice2 = (res2.data as ApiSuccessResponse<{ invoiceNumber: string }>).data.invoiceNumber

    assert.notStrictEqual(invoice1, invoice2)
  })

  test('Concurrent sale attempts cannot oversell stock', async () => {
    const { token, businessId } = await registerUser('Concurrent Sales')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const saleBody = {
      items: [{ productId, quantity: 10 }],
      discount: 0,
      tax: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
    }

    const [res1, res2] = await Promise.all([
      request('/api/v1/sales', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
        body: saleBody,
      }),
      request('/api/v1/sales', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
        body: saleBody,
      }),
    ])

    const successCount = [res1, res2].filter((r) => r.status === 201).length
    assert.strictEqual(successCount, 1)

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 0)
  })

  test('Failed transaction does not leave partial sale data', async () => {
    const { token, businessId } = await registerUser('Failed Transaction No Partial Data')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const productId2 = await createProduct(token, businessId, { stockQuantity: 5 })

    const res = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [
          { productId, quantity: 10 },
          { productId: productId2, quantity: 10 },
        ],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INSUFFICIENT_STOCK')

    const sales = await Sale.find({ businessId: new mongoose.Types.ObjectId(businessId) }).lean()
    assert.strictEqual(sales.length, 0)
  })

  test('Failed transaction does not leave incorrect inventory data', async () => {
    const { token, businessId } = await registerUser('Failed Transaction No Partial Inventory')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const productId2 = await createProduct(token, businessId, { stockQuantity: 5 })

    await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {
        items: [
          { productId, quantity: 10 },
          { productId2, quantity: 10 },
        ],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    const product1 = await Product.findById(productId).lean()
    assert.ok(product1)
    assert.strictEqual((product1 as unknown as Record<string, unknown>).stockQuantity, 10)

    const product2 = await Product.findById(productId2).lean()
    assert.ok(product2)
    assert.strictEqual((product2 as unknown as Record<string, unknown>).stockQuantity, 5)
  })

  test('Sales listing is tenant-scoped', async () => {
    const businessA = await registerUser('Sales List Biz A')
    const businessB = await registerUser('Sales List Biz B')

    const productA = await createProduct(businessA.token, businessA.businessId, {
      stockQuantity: 10,
    })
    const productB = await createProduct(businessB.token, businessB.businessId, {
      stockQuantity: 10,
    })

    await request('/api/v1/sales', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: {
        items: [{ productId: productA, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })
    await request('/api/v1/sales', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: {
        items: [{ productId: productB, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })

    const resA = await request('/api/v1/sales', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/sales', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(resA.status, 200)
    assert.strictEqual(resB.status, 200)
    const listA = (resA.data as ApiSuccessResponse<unknown[]>).data
    const listB = (resB.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(listA.length, 1)
    assert.strictEqual(listB.length, 1)
  })

  test('Single sale lookup is tenant-scoped', async () => {
    const businessA = await registerUser('Sale By ID Biz A')
    const businessB = await registerUser('Sale By ID Biz B')

    const productA = await createProduct(businessA.token, businessA.businessId, {
      stockQuantity: 10,
    })
    const saleRes = await request('/api/v1/sales', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: {
        items: [{ productId: productA, quantity: 1 }],
        discount: 0,
        tax: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      },
    })
    assert.strictEqual(saleRes.status, 201)
    const saleId = (saleRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/sales/${saleId}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Staff cannot cancel sales', async () => {
    const owner = await registerUser('Staff Cannot Cancel Sales')
    const staffEmail = `staff-cannot-cancel-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const saleId = await createSale(owner.token, owner.businessId)

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 403)
  })

  test('Owner can cancel sales', async () => {
    const { token, businessId } = await registerUser('Owner Can Cancel Sales')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const saleId = await createSale(token, businessId, { items: [{ productId, quantity: 5 }] })

    const res = await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
  })

  test('Manager can cancel sales', async () => {
    const owner = await registerUser('Manager Can Cancel Sales')
    const managerEmail = `manager-can-cancel-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 10 })
    const saleId = await createSale(owner.token, owner.businessId, {
      items: [{ productId, quantity: 5 }],
    })

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
  })

  test('Cancellation restores stock correctly', async () => {
    const { token, businessId } = await registerUser('Cancellation Restores Stock')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const saleId = await createSale(token, businessId, { items: [{ productId, quantity: 5 }] })

    const res = await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)

    const sale = await Sale.findById(saleId).lean()
    assert.ok(sale)
    assert.strictEqual((sale as unknown as Record<string, unknown>).status, 'cancelled')

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 10)

    const movements = await InventoryMovement.find({
      referenceType: 'return',
      referenceId: new mongoose.Types.ObjectId(saleId),
    }).lean()
    assert.strictEqual(movements.length, 1)
    assert.strictEqual(movements[0].quantity, 5)
    assert.strictEqual(movements[0].previousQuantity, 5)
    assert.strictEqual(movements[0].newQuantity, 10)
  })

  test('Cancelled sale cannot be cancelled twice', async () => {
    const { token, businessId } = await registerUser('Cancel Twice')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })
    const saleId = await createSale(token, businessId, { items: [{ productId, quantity: 5 }] })

    await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const res = await request(`/api/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 404)
  })
})
