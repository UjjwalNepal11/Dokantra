import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Product, InventoryMovement, Business, BusinessMember, User } from '../modules/index.js'

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

describe('Inventory', () => {
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
    const email = `inv-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Inv',
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
        sku: `INV-${randomUUID()}`,
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

  test('Unauthenticated users cannot access inventory', async () => {
    const res = await request('/api/v1/inventory', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context Inventory')
    const res = await request('/api/v1/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Staff can view inventory', async () => {
    const owner = await registerUser('Staff Can View Inventory')
    const staffEmail = `staff-can-view-inventory-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    await createProduct(owner.token, owner.businessId)

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/inventory', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.ok((res.data as ApiSuccessResponse<unknown[]>).data.length > 0)
  })

  test('Staff cannot restock', async () => {
    const owner = await registerUser('Staff Cannot Restock Inventory')
    const staffEmail = `staff-cannot-restock-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 5 })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { productId, quantity: 10, note: 'Staff restock attempt' },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Owner can restock', async () => {
    const { token, businessId } = await registerUser('Owner Can Restock Inventory')
    const productId = await createProduct(token, businessId, { stockQuantity: 5 })

    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 10, note: 'Owner restock' },
    })

    assert.strictEqual(res.status, 201)
  })

  test('Manager can restock', async () => {
    const owner = await registerUser('Manager Can Restock Inventory')
    const managerEmail = `manager-can-restock-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const productId = await createProduct(owner.token, owner.businessId, { stockQuantity: 5 })

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { productId, quantity: 10, note: 'Manager restock' },
    })

    assert.strictEqual(res.status, 201)
  })

  test('Restock increases stock correctly', async () => {
    const { token, businessId } = await registerUser('Restock Increases Stock')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 20 },
    })

    assert.strictEqual(res.status, 201)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 30)
  })

  test('Restock creates an InventoryMovement', async () => {
    const { token, businessId } = await registerUser('Restock Creates Movement')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 20 },
    })

    assert.strictEqual(res.status, 201)
    const movements = await InventoryMovement.find({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean()
    assert.strictEqual(movements.length, 1)
    assert.strictEqual(movements[0].type, 'restock')
  })

  test('Movement contains correct previousQuantity', async () => {
    const { token, businessId } = await registerUser('Movement Previous Quantity')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 20 },
    })

    const movements = await InventoryMovement.find({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean()
    assert.strictEqual(movements[0].previousQuantity, 10)
  })

  test('Movement contains correct newQuantity', async () => {
    const { token, businessId } = await registerUser('Movement New Quantity')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 20 },
    })

    const movements = await InventoryMovement.find({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean()
    assert.strictEqual(movements[0].newQuantity, 30)
  })

  test('Movement uses verified createdBy', async () => {
    const { token, businessId, userId } = await registerUser('Movement CreatedBy Verify')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 20 },
    })

    const movements = await InventoryMovement.find({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean()
    assert.strictEqual(movements[0].createdBy.toString(), userId)
  })

  test('Adjustment can increase stock', async () => {
    const { token, businessId } = await registerUser('Adjustment Can Increase Stock')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: 5, note: 'Found extra stock' },
    })

    assert.strictEqual(res.status, 201)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 15)
  })

  test('Adjustment can decrease stock', async () => {
    const { token, businessId } = await registerUser('Adjustment Can Decrease Stock')
    const productId = await createProduct(token, businessId, { stockQuantity: 20 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: -5, note: 'Damaged items' },
    })

    assert.strictEqual(res.status, 201)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 15)
  })

  test('Adjustment cannot use zero', async () => {
    const { token, businessId } = await registerUser('Adjustment Cannot Use Zero')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: 0, note: 'Zero adjustment' },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'ZERO_ADJUSTMENT_FORBIDDEN')
  })

  test('Adjustment does not require a note', async () => {
    const { token, businessId } = await registerUser('Adjustment Does Not Require Note')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: -5 },
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<unknown>
    assert.ok(body.data)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 5)
  })

  test('Adjustment cannot make stock negative', async () => {
    const { token, businessId } = await registerUser('Adjustment Cannot Make Stock Negative')
    const productId = await createProduct(token, businessId, { stockQuantity: 5 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: -10, note: 'Too many damaged items' },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'NEGATIVE_STOCK_FORBIDDEN')

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 5)
  })

  test('Failed stock operation does not leave partial movement data', async () => {
    const { token, businessId } = await registerUser('Failed Stock No Partial Movement')
    const productId = await createProduct(token, businessId, { stockQuantity: 5 })

    const res = await request('/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantityChange: -10, note: 'Should fail' },
    })

    assert.strictEqual(res.status, 400)
    const movements = await InventoryMovement.find({
      productId: new mongoose.Types.ObjectId(productId),
    }).lean()
    assert.strictEqual(movements.length, 0)
  })

  test('Business A cannot modify Business B inventory', async () => {
    const businessA = await registerUser('Business A Inventory Isolation')
    const businessB = await registerUser('Business B Inventory Isolation')

    const productId = await createProduct(businessA.token, businessA.businessId, {
      stockQuantity: 10,
    })

    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { productId, quantity: 10, note: 'Cross business restock' },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_ACCESS_DENIED')

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 10)
  })

  test('Inactive products cannot be modified', async () => {
    const { token, businessId } = await registerUser('Inactive Product Inventory')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    await request(`/api/v1/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const res = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 10, note: 'Restock inactive' },
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'PRODUCT_NOT_FOUND')
  })

  test('Inventory movement history is business-scoped', async () => {
    const businessA = await registerUser('Movement History Biz A')
    const businessB = await registerUser('Movement History Biz B')

    const productA = await createProduct(businessA.token, businessA.businessId, {
      stockQuantity: 10,
    })
    const productB = await createProduct(businessB.token, businessB.businessId, {
      stockQuantity: 10,
    })

    await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { productId: productA, quantity: 5, note: 'Biz A restock' },
    })
    await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { productId: productB, quantity: 5, note: 'Biz B restock' },
    })

    const resA = await request('/api/v1/inventory/movements', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    assert.strictEqual(resA.status, 200)
    const movementsA = (resA.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(movementsA.length, 1)

    const resB = await request('/api/v1/inventory/movements', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })
    assert.strictEqual(resB.status, 200)
    const movementsB = (resB.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(movementsB.length, 1)
  })

  test('Movement records cannot be edited through API', async () => {
    const { token, businessId } = await registerUser('Movement Cannot Edit API')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const createRes = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 5 },
    })
    assert.strictEqual(createRes.status, 201)
    const movementId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/inventory/movements/${movementId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { quantity: 100 },
    })

    assert.strictEqual(res.status, 404)

    const movement = await InventoryMovement.findById(movementId).lean()
    assert.ok(movement)
    assert.strictEqual((movement as unknown as Record<string, unknown>).quantity, 5)
  })

  test('Movement records cannot be deleted through API', async () => {
    const { token, businessId } = await registerUser('Movement Cannot Delete API')
    const productId = await createProduct(token, businessId, { stockQuantity: 10 })

    const createRes = await request('/api/v1/inventory/restock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { productId, quantity: 5 },
    })
    assert.strictEqual(createRes.status, 201)
    const movementId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/inventory/movements/${movementId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 404)

    const movement = await InventoryMovement.findById(movementId).lean()
    assert.ok(movement)
  })

  test('Product by ID is tenant-scoped in inventory', async () => {
    const businessA = await registerUser('Inventory By ID Biz A')
    const businessB = await registerUser('Inventory By ID Biz B')

    const productId = await createProduct(businessA.token, businessA.businessId)

    const res = await request(`/api/v1/inventory/${productId}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Inventory listing is tenant-scoped', async () => {
    const businessA = await registerUser('Inventory List Biz A')
    const businessB = await registerUser('Inventory List Biz B')

    await createProduct(businessA.token, businessA.businessId, { sku: 'LIST-INV-A-1' })
    await createProduct(businessB.token, businessB.businessId, { sku: 'LIST-INV-B-1' })

    const resA = await request('/api/v1/inventory', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/inventory', {
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
})
