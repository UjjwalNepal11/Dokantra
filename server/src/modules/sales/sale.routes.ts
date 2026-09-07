import { Router } from 'express'
import { cancel, create, getById, list } from './sale.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { requireBusinessContext, requireRoles } from '../../middleware/authorize.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.post(
  '/',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
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

router.post(
  '/:id/cancel',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(cancel),
)

export default router
