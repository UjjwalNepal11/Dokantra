import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp, setupTestRoutes } from '../app.js'
import { env } from '../config/env.js'
import { Business, BusinessMember, User } from '../modules/index.js'

type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
  }
}

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

describe('Authorization', () => {
  let server: http.Server
  let baseUrl = ''

  before(async () => {
    await connectDatabase(env.mongodbUri)
    const app = createApp(setupTestRoutes)
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
    const email = `authz-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Authz',
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
    const businessId = String((business as Record<string, unknown>)._id)

    const member = await BusinessMember.findOne({
      userId: new mongoose.Types.ObjectId(user.id),
      businessId: new mongoose.Types.ObjectId(businessId),
    }).lean()
    assert.ok(member, 'Membership should exist after registration')
    const membershipId = String((member as Record<string, unknown>)._id)

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

  test('Unauthenticated requests cannot establish business context', async () => {
    const res = await request('/api/v1/test/test-business-context', {
      headers: { 'X-Business-Id': '64f1a2b3c4d5e6f7a8b9c0d1' },
    })

    assert.strictEqual(res.status, 401)
  })

  test('Missing business ID is rejected for business-scoped routes', async () => {
    const { token } = await registerUser('Missing Business ID Test')
    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${token}` },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.success, false)
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('Invalid business ID format is rejected', async () => {
    const { token } = await registerUser('Invalid Business ID Test')
    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': 'not-a-valid-id' },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_BUSINESS_ID')
  })

  test('Active member can establish business context', async () => {
    const { token, businessId, membershipId } = await registerUser('Active Member Test')
    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
    const body = (
      res.data as ApiSuccessResponse<{
        businessContext: { businessId: string; membershipId: string; role: string }
      }>
    ).data
    assert.strictEqual(body.businessContext.businessId, businessId)
    assert.strictEqual(body.businessContext.membershipId, membershipId)
    assert.strictEqual(body.businessContext.role, 'owner')
  })

  test('User cannot access a business they do not belong to', async () => {
    const userA = await registerUser('User A Business')
    const userB = await registerUser('User B Business')

    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${userA.token}`, 'X-Business-Id': userB.businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_ACCESS_DENIED')
  })

  test('Inactive membership is rejected', async () => {
    const owner = await registerUser('Inactive Membership Owner')
    const memberEmail = `inactive-${randomUUID()}@example.com`
    const memberUserId = await createUser(memberEmail, 'password123')
    await addMember(memberUserId, owner.businessId, 'staff', 'inactive')

    const memberToken = await loginAs(memberEmail, 'password123')
    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${memberToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_ACCESS_DENIED')
  })

  test('Inactive business is rejected', async () => {
    const { token, businessId } = await registerUser('Inactive Business Test')
    await Business.findByIdAndUpdate(businessId, { isActive: false })

    const res = await request('/api/v1/test/test-business-context', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_NOT_ACTIVE')
  })

  test('Owner passes owner-only authorization', async () => {
    const { token, businessId } = await registerUser('Owner Only Test')
    const res = await request('/api/v1/test/test-owner-only', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.strictEqual((res.data as ApiSuccessResponse<null>).success, true)
  })

  test('Manager is rejected from owner-only authorization', async () => {
    const owner = await registerUser('Manager Reject Owner Business')
    const managerEmail = `manager-reject-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/test/test-owner-only', {
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Staff is rejected from manager/owner routes', async () => {
    const owner = await registerUser('Staff Reject Manager Owner Business')
    const staffEmail = `staff-reject-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/test/test-manager-or-owner', {
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('Allowed roles can access appropriate middleware paths', async () => {
    const owner = await registerUser('Manager Access Business')
    const managerEmail = `manager-access-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/test/test-manager-or-owner', {
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
    })

    assert.strictEqual(res.status, 200)
    assert.strictEqual((res.data as ApiSuccessResponse<null>).success, true)
  })
})
