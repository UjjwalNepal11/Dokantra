import { Response } from 'express'
import { env } from '../config/env.js'

const sameSite: 'lax' | 'strict' | 'none' = env.nodeEnv === 'production' ? 'none' : 'lax'
const domain = env.nodeEnv === 'production' ? env.cookieDomain : undefined

const COOKIE_BASE = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite,
  path: '/api/v1/auth',
  ...(domain ? { domain } : {}),
} as const

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    ...COOKIE_BASE,
    maxAge: env.refreshTokenExpiresMs,
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', COOKIE_BASE)
}
