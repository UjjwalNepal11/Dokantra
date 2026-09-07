import { Router } from 'express'
import { getMe, updateMe } from './business.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { requireBusinessContext, requireRoles } from '../../middleware/authorize.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.get('/me', authenticate, requireBusinessContext, asyncHandler(getMe))
router.patch(
  '/me',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(updateMe),
)

export default router
