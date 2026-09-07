import { Request, Response } from 'express'
import { User } from './index.js'
import { AppError } from '../../middleware/error-handler.js'
import { UpdateProfileSchema, ChangePasswordSchema } from '@dokantra/shared'
import { updateUserProfile, changeUserPassword } from './user.service.js'

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = (req as unknown as { user?: { userId: string } }).user?.userId as string
  const foundUser = await User.findById(userId).lean()

  if (!foundUser || !(foundUser as Record<string, unknown>).isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized')
  }

  const userRecord = foundUser as Record<string, unknown>

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: (userRecord._id as { toString: () => string }).toString(),
        firstName: userRecord.firstName as string,
        lastName: userRecord.lastName as string,
        email: userRecord.email as string,
      },
    },
  })
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = (req as unknown as { user?: { userId: string } }).user?.userId as string
  const input = UpdateProfileSchema.parse(req.body)
  const updatedUser = await updateUserProfile(userId, input)

  res.status(200).json({
    success: true,
    data: {
      user: updatedUser,
    },
  })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = (req as unknown as { user?: { userId: string } }).user?.userId as string
  const input = ChangePasswordSchema.parse(req.body)
  await changeUserPassword(userId, input)

  res.status(200).json({
    success: true,
    data: null,
  })
}

