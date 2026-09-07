import http from 'http'
import mongoose from 'mongoose'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { User, Business, BusinessMember } from '../modules/index.js'
import { hashPassword } from '../lib/password.js'

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

describe('Settings', () => {
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
    const email = `settings-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Settings',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName,
      },
    })

    assert.strictEqual(res.status, 201)
    const data = (
      res.data as ApiSuccessResponse<{
        user: { id: string }
        accessToken: string
      }>
    ).data
    const token = data.accessToken
    const userId = data.user.id

    const business = await Business.findOne({ ownerId: userId }).lean()
    assert.ok(business, 'Business should exist after registration')
    const businessId = String((business as unknown as Record<string, unknown>)._id)

    const member = await BusinessMember.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      businessId: new mongoose.Types.ObjectId(businessId),
    }).lean()
    assert.ok(member, 'Membership should exist after registration')
    const membershipId = String((member as unknown as Record<string, unknown>)._id)

    return { token, userId, businessId, membershipId }
  }

  async function createUser(email: string, password: string): Promise<string> {
    const passwordHash = await hashPassword(password)
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
    return (res.data as ApiSuccessResponse<{ accessToken: string }>).data.accessToken
  }

  test('PATCH /api/v1/users/me updates profile', async () => {
    const { token, userId } = await registerUser('Profile Update Test')
    const newEmail = `updated-${randomUUID()}@example.com`

    const res = await request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: { firstName: 'Updated', lastName: 'Name', email: newEmail },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{
      user: { id: string; firstName: string; lastName: string; email: string }
    }>
    assert.strictEqual(body.data.user.firstName, 'Updated')
    assert.strictEqual(body.data.user.lastName, 'Name')
    assert.strictEqual(body.data.user.email, newEmail)

    const user = await User.findById(userId).lean()
    assert.ok(user)
    const userRecord = user as Record<string, unknown>
    assert.strictEqual(userRecord.firstName, 'Updated')
    assert.strictEqual(userRecord.lastName, 'Name')
    assert.strictEqual(userRecord.email, newEmail)
  })

  test('PATCH /api/v1/users/me rejects duplicate email', async () => {
    const owner = await registerUser('Dup Email Profile')
    const otherEmail = `other-${randomUUID()}@example.com`
    await createUser(otherEmail, 'password123')

    const res = await request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { email: otherEmail },
    })

    assert.strictEqual(res.status, 409)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'EMAIL_ALREADY_EXISTS')
  })

  test('PATCH /api/v1/users/me requires authentication', async () => {
    const res = await request('/api/v1/users/me', {
      method: 'PATCH',
      body: { firstName: 'NoAuth' },
    })

    assert.strictEqual(res.status, 401)
  })

  test('POST /api/v1/users/me/password changes password', async () => {
    const email = `password-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Password',
        lastName: 'Test',
        email,
        password: 'oldpassword123',
        businessName: 'Password Change Test',
      },
    })
    const token = (registerRes.data as ApiSuccessResponse<{ accessToken: string }>).data.accessToken

    const res = await request('/api/v1/users/me/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
        confirmNewPassword: 'newpassword123',
      },
    })

    assert.strictEqual(res.status, 200)

    const loginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: 'newpassword123' },
    })
    assert.strictEqual(loginRes.status, 200)
  })

  test('POST /api/v1/users/me/password rejects incorrect current password', async () => {
    const email = `wrongpass-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Wrong',
        lastName: 'Pass',
        email,
        password: 'correctpassword123',
        businessName: 'Wrong Pass Test',
      },
    })
    const token = (registerRes.data as ApiSuccessResponse<{ accessToken: string }>).data.accessToken

    const res = await request('/api/v1/users/me/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmNewPassword: 'newpassword123',
      },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'INVALID_CURRENT_PASSWORD')
  })

  test('POST /api/v1/users/me/password requires authentication', async () => {
    const res = await request('/api/v1/users/me/password', {
      method: 'POST',
      body: { currentPassword: 'test', newPassword: 'newpass123' },
    })

    assert.strictEqual(res.status, 401)
  })

  test('GET /api/v1/businesses/me returns current business', async () => {
    const { token, businessId } = await registerUser('Get Business Test')

    const res = await request('/api/v1/businesses/me', {
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ business: { id: string; name: string } }>
    assert.ok(body.data.business)
    assert.ok(body.data.business.id)
    assert.strictEqual(body.data.business.name, 'Get Business Test')
  })

  test('GET /api/v1/businesses/me requires business context', async () => {
    const { token } = await registerUser('No Biz Context')

    const res = await request('/api/v1/businesses/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'BUSINESS_CONTEXT_REQUIRED')
  })

  test('PATCH /api/v1/businesses/me updates business for owner', async () => {
    const { token, businessId } = await registerUser('Update Biz Owner')

    const res = await request('/api/v1/businesses/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: { name: 'Updated Business', phone: '+977-9800000000', address: 'Kathmandu' },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{
      business: { name: string; phone?: string; address?: string }
    }>
    assert.strictEqual(body.data.business.name, 'Updated Business')
    assert.strictEqual(body.data.business.phone, '+977-9800000000')
    assert.strictEqual(body.data.business.address, 'Kathmandu')

    const business = await Business.findById(businessId).lean()
    assert.ok(business)
    const bizRecord = business as Record<string, unknown>
    assert.strictEqual(bizRecord.name, 'Updated Business')
    assert.strictEqual(bizRecord.phone, '+977-9800000000')
  })

  test('PATCH /api/v1/businesses/me rejects staff updates', async () => {
    const owner = await registerUser('Staff Biz Update')
    const staffEmail = `staff-biz-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'active')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/businesses/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Hacked Business' },
    })

    assert.strictEqual(res.status, 403)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'FORBIDDEN')
  })

  test('PATCH /api/v1/businesses/me allows manager updates', async () => {
    const owner = await registerUser('Manager Biz Update')
    const managerEmail = `manager-biz-${randomUUID()}@example.com`
    const managerUserId = await createUser(managerEmail, 'password123')
    await addMember(managerUserId, owner.businessId, 'manager', 'active')

    const managerToken = await loginAs(managerEmail, 'password123')
    const res = await request('/api/v1/businesses/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${managerToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Manager Updated Biz' },
    })

    assert.strictEqual(res.status, 200)
    const body = res.data as ApiSuccessResponse<{ business: { name: string } }>
    assert.strictEqual(body.data.business.name, 'Manager Updated Biz')
  })

  test('PATCH /api/v1/businesses/me rejects inactive membership', async () => {
    const owner = await registerUser('Inactive Biz Member')
    const staffEmail = `inactive-biz-${randomUUID()}@example.com`
    const staffUserId = await createUser(staffEmail, 'password123')
    await addMember(staffUserId, owner.businessId, 'staff', 'inactive')

    const staffToken = await loginAs(staffEmail, 'password123')
    const res = await request('/api/v1/businesses/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}`, 'X-Business-Id': owner.businessId },
      body: { name: 'Should Fail' },
    })

    assert.strictEqual(res.status, 403)
  })

  test('PATCH /api/v1/users/me rejects empty update', async () => {
    const { token } = await registerUser('Empty Update')

    const res = await request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: {},
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'NO_UPDATE_FIELDS')
  })

  test('PATCH /api/v1/businesses/me rejects empty update', async () => {
    const { token, businessId } = await registerUser('Empty Biz Update')

    const res = await request('/api/v1/businesses/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'X-Business-Id': businessId },
      body: {},
    })

    assert.strictEqual(res.status, 400)
    const body = res.data as ApiErrorResponse
    assert.strictEqual(body.error.code, 'NO_UPDATE_FIELDS')
  })
})
