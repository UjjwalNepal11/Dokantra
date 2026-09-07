import { Router } from 'express'
import { create, list, getById, update, remove } from './product.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { requireBusinessContext, requireRoles } from '../../middleware/authorize.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.post(
  '/',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(create),
)

router.get(
  '/',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(list),
)

router.get(
  '/:id',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(getById),
)

router.patch(
  '/:id',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(update),
)

router.delete(
  '/:id',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(remove),
)

export default router
