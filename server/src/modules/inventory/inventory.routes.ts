import { Router } from 'express'
import { adjust, getProduct, list, movements, restock } from './inventory.controller.js'
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
  '/movements',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(movements),
)

router.get(
  '/:productId',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(getProduct),
)

router.post(
  '/restock',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(restock),
)

router.post(
  '/adjust',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(adjust),
)

export default router
