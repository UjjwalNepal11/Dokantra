import { Router } from 'express'
import {
  createInternal,
  deleteHandler,
  list,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} from './notification.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { requireBusinessContext, requireRoles } from '../../middleware/authorize.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.get(
  '/',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(list),
)

router.get(
  '/unread-count',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(getUnreadCountHandler),
)

router.patch(
  '/:id/read',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(markAsReadHandler),
)

router.patch(
  '/read-all',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(markAllAsReadHandler),
)

router.delete(
  '/:id',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(deleteHandler),
)

export { router as notificationRoutes, createInternal }
