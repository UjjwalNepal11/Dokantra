import 'cookie-parser'

declare module 'express' {
  interface Request {
    cookies?: Record<string, string | undefined>
  }
}
