import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Missing required environment variable: MONGODB_URI')
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET

if (!JWT_ACCESS_SECRET) {
  throw new Error('Missing required environment variable: JWT_ACCESS_SECRET')
}

if (!REFRESH_TOKEN_SECRET) {
  throw new Error('Missing required environment variable: REFRESH_TOKEN_SECRET')
}

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d'

function parseDuration(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim())
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }
  const value = Number(match[1])
  const unit = match[2]
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return value * multipliers[unit]
}

const NODE_ENV = process.env.NODE_ENV ?? 'development'
const PORT = Number(process.env.PORT ?? 5000)
const CLIENT_URL = process.env.CLIENT_URL

if (NODE_ENV === 'production' && !CLIENT_URL) {
  throw new Error('Missing required environment variable: CLIENT_URL')
}

export const env = {
  nodeEnv: NODE_ENV,
  port: PORT,
  clientUrl: CLIENT_URL ?? 'http://localhost:5173',
  cookieDomain: process.env.COOKIE_DOMAIN,
  mongodbUri: MONGODB_URI,
  jwtAccessSecret: JWT_ACCESS_SECRET,
  accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
  accessTokenExpiresMs: parseDuration(ACCESS_TOKEN_EXPIRES_IN),
  refreshTokenSecret: REFRESH_TOKEN_SECRET,
  refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
  refreshTokenExpiresMs: parseDuration(REFRESH_TOKEN_EXPIRES_IN),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  authRateLimitMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 5),
}
