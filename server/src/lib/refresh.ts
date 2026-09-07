import crypto from 'crypto'
import { env } from '../config/env.js'

export function generateRawRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

export function hashRefreshToken(token: string): string {
  return crypto.createHmac('sha256', env.refreshTokenSecret).update(token).digest('hex')
}
