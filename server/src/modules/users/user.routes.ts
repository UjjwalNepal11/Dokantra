import { Router } from 'express'
import { getMe, updateMe, changePassword } from './user.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.get('/me', authenticate, asyncHandler(getMe))
router.patch('/me', authenticate, asyncHandler(updateMe))
router.post('/me/password', authenticate, asyncHandler(changePassword))

export default router
