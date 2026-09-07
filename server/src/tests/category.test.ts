import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { Category, Business, BusinessMember, User } from '../modules/index.js'

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

describe('Categories', () => {
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
    const email = `cat-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Cat',
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
    const res = await request('/api/v1/categories', {
      headers: { 'X-Business-Id': new mongoose.Types.ObjectId().toHexString() },
    })
    assert.strictEqual(res.status, 401)
  })

  test('Missing business context is rejected', async () => {
    const { token } = await registerUser('Missing Business Context')
    const res = await request('/api/v1/categories', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Staff cannot create categories', async () => {
    const owner = await registerUser('Staff Cannot Create')
    const staffEmail = `staff-cannot-create-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Beverages' },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Owner can create categories', async () => {
    const { token, businessId } = await registerUser('Owner Can Create')
    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Beverages', description: 'Drinks and refreshments' },
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{
      id: string
      name: string
      description?: string
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
    assert.strictEqual(body.data.name, 'Beverages')
    assert.strictEqual(body.data.description, 'Drinks and refreshments')
    assert.strictEqual(body.data.isActive, true)
  })

  test('Manager can create categories', async () => {
    const owner = await registerUser('Manager Can Create')
    const managerEmail = `manager-can-create-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Snacks' },
    })

    assert.strictEqual(res.status, 201)
    const body = res.data as ApiSuccessResponse<{
      id: string
      name: string
      description?: string
      isActive: boolean
    }>
    assert.strictEqual(body.data.name, 'Snacks')
  })

  test('Category is created with verified businessId', async () => {
    const { token, businessId } = await registerUser('Category BusinessId Verify')
    const otherBusiness = await Business.create([
      { name: 'Other Biz', slug: `other-${randomUUID()}`, ownerId: new mongoose.Types.ObjectId() },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Fresh Produce' },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const category = await Category.findById(created.id).lean()
    assert.ok(category)
    assert.strictEqual(
      String((category as unknown as Record<string, unknown>).businessId),
      businessId,
    )
    assert.notStrictEqual(
      String((category as unknown as Record<string, unknown>).businessId),
      otherBusinessId,
    )
  })

  test('Client cannot spoof businessId through request body', async () => {
    const ownerA = await registerUser('Spoof A')
    const ownerB = await registerUser('Spoof B')

    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerA.token}`, 'X-Business-Id': ownerA.businessId },
      body: { name: 'Spoofed', businessId: ownerB.businessId },
    })

    assert.strictEqual(res.status, 201)
    const created = (res.data as ApiSuccessResponse<{ id: string }>).data
    const category = await Category.findById(created.id).lean()
    assert.strictEqual(
      String((category as unknown as Record<string, unknown>).businessId),
      ownerA.businessId,
    )
  })

  test('Business A cannot read Business B categories', async () => {
    const businessA = await registerUser('Business A')
    const businessB = await registerUser('Business B')

    await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'A Category' },
    })

    const res = await request('/api/v1/categories', {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })

    assert.strictEqual(res.status, 403)
  })

  test('Business A cannot read Business B category by ID', async () => {
    const businessA = await registerUser('Biz A Read By ID')
    const businessB = await registerUser('Biz B Read By ID')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Secret Category' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/categories/${categoryId}`, {
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Duplicate category names are rejected', async () => {
    const { token, businessId } = await registerUser('Duplicate Name')

    await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Electronics' },
    })

    const res = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Electronics' },
    })

    assert.strictEqual(res.status, 409)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'CATEGORY_ALREADY_EXISTS')
  })

  test('Category listing is scoped to the current business', async () => {
    const businessA = await registerUser('List Scoped A')
    const businessB = await registerUser('List Scoped B')

    await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Category A1' },
    })
    await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Category A2' },
    })
    await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
      body: { name: 'Category B1' },
    })

    const resA = await request('/api/v1/categories', {
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
    })
    const resB = await request('/api/v1/categories', {
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

  test('Staff can read categories', async () => {
    const owner = await registerUser('Staff Can Read')
    const staffEmail = `staff-can-read-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Staff Readable' },
    })

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/categories', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.ok((res.data as ApiSuccessResponse<unknown[]>).data.length > 0)
  })

  test('Staff cannot update categories', async () => {
    const owner = await registerUser('Staff Cannot Update')
    const staffEmail = `staff-cannot-update-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Staff Cannot Update Category' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request(`/api/v1/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updated Name' },
    })

    assert.strictEqual(res.status, 403)
  })

  test('Owner/manager can update categories', async () => {
    const owner = await registerUser('Update Can Update')
    const managerEmail = `manager-update-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updatable' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request(`/api/v1/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Updated Category', description: 'New description' },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ name: string; description?: string }>
    assert.strictEqual(body.data.name, 'Updated Category')
    assert.strictEqual(body.data.description, 'New description')
  })

  test('Category update rejects unknown sensitive fields', async () => {
    const { token, businessId } = await registerUser('Cannot Change BusinessId')
    const otherBusiness = await Business.create([
      {
        name: 'Other Biz',
        slug: `other-biz-${randomUUID()}`,
        ownerId: new mongoose.Types.ObjectId(),
      },
    ])
    const otherBusinessId = String((otherBusiness[0] as unknown as Record<string, unknown>)._id)

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Immutable BusinessId' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { businessId: otherBusinessId },
    })

    assert.strictEqual(res.status, 400)
    const category = await Category.findById(categoryId).lean()
    assert.strictEqual(
      String((category as unknown as Record<string, unknown>).businessId),
      businessId,
    )
  })

  test('Delete is scoped to the current business', async () => {
    const businessA = await registerUser('Delete Scoped A')
    const businessB = await registerUser('Delete Scoped B')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessA.token}`,
        'X-Business-Id': businessA.businessId,
      },
      body: { name: 'Deletable Category' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    const res = await request(`/api/v1/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${businessB.token}`,
        'X-Business-Id': businessB.businessId,
      },
    })

    assert.strictEqual(res.status, 404)
  })

  test('Deactivated categories are excluded by default', async () => {
    const { token, businessId } = await registerUser('Deactivated Excluded')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Will Deactivate' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const listRes = await request('/api/v1/categories', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listRes.status, 200)
    const categories = (listRes.data as ApiSuccessResponse<unknown[]>).data
    assert.strictEqual(categories.length, 0)
  })

  test('includeInactive behavior works', async () => {
    const { token, businessId } = await registerUser('Include Inactive')

    const createRes = await request('/api/v1/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Inactive Category' },
    })
    assert.strictEqual(createRes.status, 201)
    const categoryId = (createRes.data as ApiSuccessResponse<{ id: string }>).data.id

    await request(`/api/v1/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    const listWithoutRes = await request('/api/v1/categories', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listWithoutRes.status, 200)
    assert.strictEqual((listWithoutRes.data as ApiSuccessResponse<unknown[]>).data.length, 0)

    const listWithRes = await request('/api/v1/categories?includeInactive=true', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })
    assert.strictEqual(listWithRes.status, 200)
    assert.strictEqual((listWithRes.data as ApiSuccessResponse<unknown[]>).data.length, 1)
  })
})
