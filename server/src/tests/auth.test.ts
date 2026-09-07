import http from 'http'
import { randomUUID } from 'crypto'
import { before, after, test, describe } from 'node:test'
import assert from 'node:assert'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../app.js'
import { env } from '../config/env.js'

describe('Authentication', () => {
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

  function getCookies(headers: Record<string, string | string[]>): string[] {
    const cookieHeader = headers['set-cookie']
    if (Array.isArray(cookieHeader)) {
      return cookieHeader.map((cookie) => cookie.split(';')[0]?.trim() ?? '')
    }
    if (typeof cookieHeader === 'string') {
      return [cookieHeader.split(';')[0]?.trim() ?? '']
    }
    return []
  }

  test('POST /api/v1/auth/register succeeds with valid input', async () => {
    const email = `test-${randomUUID()}@example.com`
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email,
        password: 'securepassword123',
        businessName: 'Test Store',
      },
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual((res.data as Record<string, unknown>).success, true)
    const data = (res.data as Record<string, unknown>).data as Record<string, unknown>
    assert.ok(data.user)
    assert.strictEqual((data.user as Record<string, unknown>).email, email)
    assert.ok(data.accessToken)
    assert.ok(getCookies(res.headers).some((c) => c.startsWith('refreshToken=')))
  })

  test('POST /api/v1/auth/register rejects duplicate email', async () => {
    const email = `dup-${randomUUID()}@example.com`
    await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        password: 'securepassword123',
        businessName: 'Dup Store',
      },
    })

    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        password: 'securepassword123',
        businessName: 'Dup Store',
      },
    })

    assert.strictEqual(res.status, 409)
  })

  test('Password is stored hashed', async () => {
    const email = `hash-${randomUUID()}@example.com`
    await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Hash',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Hash Store',
      },
    })

    const { User } = await import('../modules/users/index.js')
    const user = await User.findOne({ email }).select('+passwordHash').lean()
    assert.ok(user)
    const userRecord = user as Record<string, unknown>
    assert.ok(userRecord.passwordHash)
    assert.notStrictEqual(userRecord.passwordHash, 'securepassword123')
    assert.ok(String(userRecord.passwordHash).startsWith('$argon2'))
  })

  test('POST /api/v1/auth/login succeeds with correct credentials', async () => {
    const email = `login-${randomUUID()}@example.com`
    await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Login',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Login Store',
      },
    })

    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email,
        password: 'securepassword123',
      },
    })

    assert.strictEqual(res.status, 200)
    const data = (res.data as Record<string, unknown>).data as Record<string, unknown>
    assert.ok(data.accessToken)
    assert.ok(getCookies(res.headers).some((c) => c.startsWith('refreshToken=')))
  })

  test('POST /api/v1/auth/login fails safely with incorrect credentials', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    })

    assert.strictEqual(res.status, 401)
    assert.strictEqual((res.data as Record<string, unknown>).success, false)
    const error = (res.data as Record<string, unknown>).error as Record<string, unknown>
    assert.strictEqual(error.code, 'AUTHENTICATION_FAILED')
    assert.strictEqual(error.message, 'Invalid credentials')
  })

  test('POST /api/v1/auth/login fails with same error for wrong password on existing user', async () => {
    const email = `wrongpw-${randomUUID()}@example.com`
    await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Wrong',
        lastName: 'Pw',
        email,
        password: 'securepassword123',
        businessName: 'Wrong Pw Store',
      },
    })

    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email,
        password: 'wrongpassword',
      },
    })

    assert.strictEqual(res.status, 401)
    assert.strictEqual((res.data as Record<string, unknown>).success, false)
    const error = (res.data as Record<string, unknown>).error as Record<string, unknown>
    assert.strictEqual(error.code, 'AUTHENTICATION_FAILED')
    assert.strictEqual(error.message, 'Invalid credentials')
  })

  test('POST /api/v1/auth/login fails with same error for non-existent user', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: `missing-${randomUUID()}@example.com`,
        password: 'wrongpassword',
      },
    })

    assert.strictEqual(res.status, 401)
    assert.strictEqual((res.data as Record<string, unknown>).success, false)
    const error = (res.data as Record<string, unknown>).error as Record<string, unknown>
    assert.strictEqual(error.code, 'AUTHENTICATION_FAILED')
    assert.strictEqual(error.message, 'Invalid credentials')
  })

  test('Access token works on protected routes', async () => {
    const email = `protect-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Protect',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Protect Store',
      },
    })

    const registerData = (registerRes.data as Record<string, unknown>).data as Record<
      string,
      unknown
    >
    const token = registerData.accessToken as string

    const res = await request('/api/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    assert.strictEqual(res.status, 200)
    const data = (res.data as Record<string, unknown>).data as Record<string, unknown>
    assert.strictEqual((data.user as Record<string, unknown>).email, email)
  })

  test('Invalid access token is rejected', async () => {
    const res = await request('/api/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    })

    assert.strictEqual(res.status, 401)
  })

  test('Refresh issues a new access token', async () => {
    const email = `refresh-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Refresh',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Refresh Store',
      },
    })

    const cookies = getCookies(registerRes.headers)
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='))
    assert.ok(refreshCookie)

    const res = await request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: refreshCookie!,
      },
    })

    assert.strictEqual(res.status, 200)
    const data = (res.data as Record<string, unknown>).data as Record<string, unknown>
    assert.ok(data.accessToken)
  })

  test('Refresh token rotation works', async () => {
    const email = `rotation-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Rotation',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Rotation Store',
      },
    })

    const firstCookies = getCookies(registerRes.headers)
    const firstCookie = firstCookies.find((c) => c.startsWith('refreshToken='))

    const refreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: firstCookie!,
      },
    })

    assert.strictEqual(refreshRes.status, 200)

    const reuseRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: firstCookie!,
      },
    })

    assert.strictEqual(reuseRes.status, 401)
  })

  test('Logout revokes the session', async () => {
    const email = `logout-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Logout',
        lastName: 'Test',
        email,
        password: 'securepassword123',
        businessName: 'Logout Store',
      },
    })

    const cookies = getCookies(registerRes.headers)
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='))

    const logoutRes = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: refreshCookie!,
      },
    })

    assert.strictEqual(logoutRes.status, 200)

    const refreshRes = await request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: refreshCookie!,
      },
    })

    assert.strictEqual(refreshRes.status, 401)
  })

  test('GET /api/v1/users/me requires authentication', async () => {
    const res = await request('/api/v1/users/me', {
      method: 'GET',
    })

    assert.strictEqual(res.status, 401)
  })

  test('passwordHash is never returned in API responses', async () => {
    const email = `hashcheck-${randomUUID()}@example.com`
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Hash',
        lastName: 'Check',
        email,
        password: 'securepassword123',
        businessName: 'Hash Check Store',
      },
    })

    const responseStr = JSON.stringify(registerRes.data)
    assert.ok(!responseStr.includes('passwordHash'))
  })
})
