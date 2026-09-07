import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Product, Business, BusinessMember, User } from '../modules/index.js'

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

describe('Products', () => {
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
    const email = `prod-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Prod',
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

  async function createCategory(token: string, businessId: string, name: string): Promise<string> {
    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name },
    })
    assert.strictEqual(res.status, 201)
    return (res.data as ApiSuccessResponse<{ id: string }>).data.id
  }

  async function deactivateCategory(
    token: string,
    businessId: string,
    categoryId: string,
  ): Promise<void> {
    const res = await request(`/api/v1/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(res.status, 200)
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

  const productPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'Coca Cola 500ml',
    sku: 'COKE-500',
    categoryId: undefined,
    description: 'Soft drink',
    sellingPrice: 100,
    costPrice: 80,
    stockQuantity: 0,
    lowStockThreshold: 10,
    unit: 'piece',
    ...overrides,
  })

  test('Unauthenticated requests are rejected', async () => {
    const res = await request('/api/v1/products', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context')
    const res = await request('/api/v1/products', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Staff can read products', async () => {
    const owner = await registerUser('Staff Can Read Products')
    const staffEmail = `staff-can-read-products-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'STAFF-READ-1' }),
    })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/products', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.ok((res.data as ApiSuccessResponse<unknown[]>).data.length > 0)
  })

  test('Staff cannot create products', async () => {
    const owner = await registerUser('Staff Cannot Create Product')
    const staffEmail = `staff-cannot-create-product-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'STAFF-NO-CREATE' }),
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Owner can create products', async () => {
    const { token, businessId } = await registerUser('Owner Can Create Product')
    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'OWNER-CREATE-1', name: 'Owner Product' }),
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{
      id: string
      name: string
      sku: string
      sellingPrice: number
      costPrice: number
      stockQuantity: number
      lowStockThreshold: number
      unit: string
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
    assert.strictEqual(body.data.name, 'Owner Product')
    assert.strictEqual(body.data.sku, 'OWNER-CREATE-1')
    assert.strictEqual(body.data.sellingPrice, 100)
    assert.strictEqual(body.data.costPrice, 80)
    assert.strictEqual(body.data.stockQuantity, 0)
    assert.strictEqual(body.data.lowStockThreshold, 10)
    assert.strictEqual(body.data.unit, 'piece')
    assert.strictEqual(body.data.isActive, true)
  })

  test('Manager can create products', async () => {
    const owner = await registerUser('Manager Can Create Product')
    const managerEmail = `manager-can-create-product-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'MANAGER-CREATE-1', name: 'Manager Product' }),
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{ id: string; name: string }>
    assert.strictEqual(body.data.name, 'Manager Product')
  })

  test('Product is created with verified businessId', async () => {
    const { token, businessId } = await registerUser('Product BusinessId Verify')
    const otherBusiness = await Business.create([
      { name: 'Other Biz', slug: `other-${randomUUID()}`, ownerId: new mongoose.Types.ObjectId() },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'BIZ-VERIFY-1' }),
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const product = await Product.findById(created.id).lean()
    assert.ok(product)
    assert.strictEqual(
      String((product as unknown as Record<string, unknown>).businessId),
      businessId,
    )
    assert.notStrictEqual(
      String((product as unknown as Record<string, unknown>).businessId),
      otherBusinessId,
    )
  })

  test('Client cannot spoof businessId through request body', async () => {
    const ownerA = await registerUser('Spoof Product A')
    const ownerB = await registerUser('Spoof Product B')

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: { ...productPayload({ sku: 'SPOOF-PROD-1' }), businessId: ownerB.businessId },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const product = await Product.findById(created.id).lean()
    assert.strictEqual(
      String((product as unknown as Record<string, unknown>).businessId),
      ownerA.businessId,
    )
  })

  test('Product cannot use another business category', async () => {
    const businessA = await registerUser('Product Cat Biz A')
    const businessB = await registerUser('Product Cat Biz B')

    const categoryId = await createCategory(businessA.token, businessA.businessId, 'Biz A Category')

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: productPayload({ sku: 'OTHER-BIZ-CAT', categoryId }),
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CATEGORY_NOT_FOUND')
  })

  test('Product cannot use inactive category', async () => {
    const owner = await registerUser('Product Inactive Category')
    const categoryId = await createCategory(owner.token, owner.businessId, 'Inactive Category')
    await deactivateCategory(owner.token, owner.businessId, categoryId)

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'INACTIVE-CAT-PROD', categoryId }),
    })

    assert.strictEqual(res.status, 404)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CATEGORY_NOT_FOUND')
  })

  test('Duplicate SKUs are rejected within the same business', async () => {
    const { token, businessId } = await registerUser('Duplicate SKU')

    await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'DUP-SKU-1' }),
    })

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'DUP-SKU-1' }),
    })

    assert.strictEqual(res.status, 409)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'DUPLICATE_SKU')
  })

  test('Business A can use the same SKU as Business B', async () => {
    const businessA = await registerUser('SKU Biz A')
    const businessB = await registerUser('SKU Biz B')

    const resA = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'SHARED-SKU-1' }),
    })

    const resB = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: productPayload({ sku: 'SHARED-SKU-1' }),
    })

    assert.strictEqual(resA.status, 201)
    assert.strictEqual(resB.status, 201)
  })

  test('Product listing is scoped to the current business', async () => {
    const businessA = await registerUser('List Scoped Prod A')
    const businessB = await registerUser('List Scoped Prod B')

    await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'LIST-A-1' }),
    })
    await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'LIST-A-2' }),
    })
    await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: productPayload({ sku: 'LIST-B-1' }),
    })

    const resA = await request('/api/v1/products', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/products', {
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

  test('Product by ID is tenant-scoped', async () => {
    const businessA = await registerUser('By ID Biz A')
    const businessB = await registerUser('By ID Biz B')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'BY-ID-A' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Search is tenant-scoped', async () => {
    const businessA = await registerUser('Search Biz A')
    const businessB = await registerUser('Search Biz B')

    await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'SEARCH-A-1', name: 'Searchable A' }),
    })
    await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: productPayload({ sku: 'SEARCH-B-1', name: 'Searchable B' }),
    })

    const res = await request('/api/v1/products?search=Searchable', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })

    assert.strictEqual(res.status, 200)
    const products = (res.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(products.length, 1)
    assert.strictEqual((products[0] as Record<string, unknown>).sku, 'SEARCH-A-1')
  })

  test('Low-stock filtering works', async () => {
    const { token, businessId } = await registerUser('Low Stock Filter')

    await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'LOW-STOCK-1', stockQuantity: 2, lowStockThreshold: 10 }),
    })
    await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'LOW-STOCK-2', stockQuantity: 5, lowStockThreshold: 5 }),
    })
    await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'NOT-LOW-STOCK', stockQuantity: 20, lowStockThreshold: 5 }),
    })

    const res = await request('/api/v1/products?lowStock=true', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
    const products = (res.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(products.length, 2)
    const skus = products.map((p: unknown) => (p as Record<string, unknown>).sku as string).sort()
    assert.deepStrictEqual(skus, ['LOW-STOCK-1', 'LOW-STOCK-2'])
  })

  test('Owner/manager can update products', async () => {
    const owner = await registerUser('Update Can Update Product')
    const managerEmail = `manager-update-product-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'UPDATE-PROD-1' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updated Product', sellingPrice: 150 },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ name: string; sellingPrice: number }>
    assert.strictEqual(body.data.name, 'Updated Product')
    assert.strictEqual(body.data.sellingPrice, 150)
  })

  test('Staff cannot update products', async () => {
    const owner = await registerUser('Staff Cannot Update Product')
    const staffEmail = `staff-cannot-update-product-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: productPayload({ sku: 'STAFF-NO-UPDATE-PROD' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updated By Staff' },
    })

    assert.strictEqual(res.status, 403)
  })

  test('Product update rejects unknown sensitive fields', async () => {
    const { token, businessId } = await registerUser('Cannot Change BusinessId Product')
    const otherBusiness = await Business.create([
      {
        name: 'Other Biz Product',
        slug: `other-biz-product-${randomUUID()}`,
        ownerId: new mongoose.Types.ObjectId(),
      },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'IMMUTABLE-BIZ-PROD' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { businessId: otherBusinessId },
    })

    assert.strictEqual(res.status, 400)
    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual(
      String((product as unknown as Record<string, unknown>).businessId),
      businessId,
    )
  })

  test('CategoryId validation works during update', async () => {
    const ownerA = await registerUser('Cat Update Biz A')
    const ownerB = await registerUser('Cat Update Biz B')

    const categoryA = await createCategory(ownerA.token, ownerA.businessId, 'Category A')
    const categoryB = await createCategory(ownerB.token, ownerB.businessId, 'Category B')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: productPayload({ sku: 'CAT-UPDATE-PROD-1', categoryId: categoryA }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const resOtherBiz = await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: { categoryId: categoryB },
    })

    assert.strictEqual(resOtherBiz.status, 404)
    const body = resOtherBiz.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CATEGORY_NOT_FOUND')
  })

  test('stockQuantity cannot be updated through PATCH', async () => {
    const { token, businessId } = await registerUser('Stock Update Forbidden')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'STOCK-FORBIDDEN-1', stockQuantity: 5 }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { stockQuantity: 100 },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'STOCK_UPDATE_FORBIDDEN')

    const product = await Product.findById(productId).lean()
    assert.ok(product)
    assert.strictEqual((product as unknown as Record<string, unknown>).stockQuantity, 5)
  })

  test('DELETE deactivates instead of hard-deleting', async () => {
    const { token, businessId } = await registerUser('Delete Deactivates Product')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'DELETE-DEACTIVATE-1' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)

    const product = await Product.findById(productId).lean()
    assert.ok(product, 'Product should still exist after deactivation')
    assert.strictEqual((product as unknown as Record<string, unknown>).isActive, false)
  })

  test('Deactivated products are excluded by default', async () => {
    const { token, businessId } = await registerUser('Deactivated Excluded Product')

    const createRes = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'DEACTIVATED-EXCLUDED-1' }),
    })
    assert.strictEqual(createRes.status, 201)
    const productId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const listRes = await request('/api/v1/products', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listRes.status, 200)
    const products = (listRes.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(products.length, 0)
  })

  test('SKU uniqueness is scoped per business', async () => {
    const businessA = await registerUser('SKU Scoped A')
    const businessB = await registerUser('SKU Scoped B')

    const resA = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: productPayload({ sku: 'SCOPED-SKU-1' }),
    })

    const resB = await request('/api/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: productPayload({ sku: 'SCOPED-SKU-1' }),
    })

    assert.strictEqual(resA.status, 201)
    assert.strictEqual(resB.status, 201)
  })

  test('Product with category uses verified businessId', async () => {
    const { token, businessId } = await registerUser('Product Cat BusinessId')
    const categoryId = await createCategory(token, businessId, 'Verified Category')

    const res = await request('/api/v1/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: productPayload({ sku: 'CAT-BIZ-VERIFY-1', categoryId }),
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string; categoryId?: string }>).data
    const product = await Product.findById(created.id).lean()
    assert.ok(product)
    assert.strictEqual(
      String((product as unknown as Record<string, unknown>).categoryId),
      categoryId,
    )
  })
})
