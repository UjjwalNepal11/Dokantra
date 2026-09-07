import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/tokens.js'
import { AppError } from './error-handler.js'

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.')
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    if (payload.tokenType !== 'access') {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.')
    }
    req.user = {
      userId: payload.userId,
      tokenType: payload.tokenType,
    }
    next()
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.')
  }
}
