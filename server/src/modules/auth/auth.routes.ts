import { Router } from 'express'
import { register, login, refresh, logout, me } from './auth.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', authLimiter, asyncHandler(register))
router.post('/login', authLimiter, asyncHandler(login))
router.post('/refresh', authLimiter, asyncHandler(refresh))
router.post('/logout', asyncHandler(logout))
router.get('/me', authenticate, asyncHandler(me))

export default router
