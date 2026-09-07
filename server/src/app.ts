import express, { Router } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { getConnectionState } from './config/database.js'
import { authRoutes } from './modules/auth/index.js'
import { userRoutes } from './modules/users/index.js'
import { businessRoutes } from './modules/businesses/index.js'
import { categoryRoutes } from './modules/categories/index.js'
import { productRoutes } from './modules/products/index.js'
import { inventoryRoutes } from './modules/inventory/index.js'
import { customerRoutes } from './modules/customers/index.js'
import { saleRoutes } from './modules/sales/index.js'
import { expenseRoutes } from './modules/expenses/index.js'
import { dashboardRoutes } from './modules/dashboard/index.js'
import { reportRoutes } from './modules/reports/index.js'
import { notificationRoutes } from './modules/notifications/index.js'
import { authenticate } from './middleware/auth.js'
import { requireBusinessContext, requireRoles } from './middleware/authorize.js'
import { asyncHandler } from './middleware/async-handler.js'

export type TestRoutesCallback = (app: express.Express) => void

export function createApp(setupTestRoutes?: TestRoutesCallback) {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api/v1', limiter)

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/users', userRoutes)
  app.use('/api/v1/businesses', businessRoutes)
  app.use('/api/v1/categories', categoryRoutes)
  app.use('/api/v1/products', productRoutes)
  app.use('/api/v1/inventory', inventoryRoutes)
  app.use('/api/v1/customers', customerRoutes)
  app.use('/api/v1/sales', saleRoutes)
  app.use('/api/v1/expenses', expenseRoutes)
  app.use('/api/v1/dashboard', dashboardRoutes)
  app.use('/api/v1/reports', reportRoutes)
  app.use('/api/v1/notifications', notificationRoutes)

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: { status: 'ok' },
    })
  })

  app.get('/ready', (_req, res) => {
    const dbState = getConnectionState()
    const isReady = dbState === 'connected'

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not ready',
        database: dbState,
      },
    })
  })

  if (setupTestRoutes) {
    setupTestRoutes(app)
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export function setupTestRoutes(app: express.Express): void {
  const testRouter = Router()

  testRouter.get(
    '/test-business-context',
    authenticate,
    requireBusinessContext,
    asyncHandler(async (req, res) => {
      res.status(200).json({
        success: true,
        data: { businessContext: req.businessContext },
      })
    }),
  )

  testRouter.get(
    '/test-owner-only',
    authenticate,
    requireBusinessContext,
    requireRoles('owner'),
    asyncHandler(async (_req, res) => {
      res.status(200).json({ success: true, data: { allowed: true } })
    }),
  )

  testRouter.get(
    '/test-manager-or-owner',
    authenticate,
    requireBusinessContext,
    requireRoles('owner', 'manager'),
    asyncHandler(async (_req, res) => {
      res.status(200).json({ success: true, data: { allowed: true } })
    }),
  )

  app.use('/api/v1/test', testRouter)
}
