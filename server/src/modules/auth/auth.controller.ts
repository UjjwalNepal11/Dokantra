import { Request, Response } from 'express'
import { RegisterSchema, LoginSchema } from '@dokantra/shared'
import {
  register as authRegister,
  login as authLogin,
  rotateRefreshToken,
  logout as authLogout,
  getCurrentUser,
} from './auth.service.js'
import { setRefreshCookie, clearRefreshCookie } from '../../lib/cookies.js'
import { AppError } from '../../middleware/error-handler.js'

export async function register(req: Request, res: Response): Promise<void> {
  const input = RegisterSchema.parse(req.body)
  const result = await authRegister(input)

  setRefreshCookie(res, result.refreshToken)

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      businessContext: result.businessContext,
    },
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = LoginSchema.parse(req.body)
  const result = await authLogin(input)

  setRefreshCookie(res, result.refreshToken)

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      businessContext: result.businessContext,
    },
  })
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.refreshToken
  if (!rawRefreshToken) {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.')
  }

  const tokens = await rotateRefreshToken(rawRefreshToken)
  setRefreshCookie(res, tokens.refreshToken)

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
    },
  })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.refreshToken
  await authLogout(rawRefreshToken)
  clearRefreshCookie(res)

  res.status(200).json({
    success: true,
    data: null,
  })
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await getCurrentUser(req.user?.userId as string)
  res.status(200).json({
    success: true,
    data: { user },
  })
}

