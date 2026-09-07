import mongoose from 'mongoose'
import { User } from './user.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import type { AuthUser } from '../../modules/auth/auth.service.js'

export type UpdateProfileInput = {
  firstName?: string
  lastName?: string
  email?: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

function toAuthUser(user: {
  _id: mongoose.Types.ObjectId
  firstName: string
  lastName: string
  email: string
}): AuthUser {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthUser> {
  const updateData: Record<string, unknown> = {}

  if (input.firstName !== undefined) {
    updateData.firstName = input.firstName.trim()
  }

  if (input.lastName !== undefined) {
    updateData.lastName = input.lastName.trim()
  }

  if (input.email !== undefined) {
    const normalizedEmail = input.email.toLowerCase().trim()
    const existingUser = await User.findOne({ email: normalizedEmail }).lean()
    if (existingUser) {
      const existingRecord = existingUser as unknown as Record<string, unknown>
      if ((existingRecord._id as { toString: () => string }).toString() !== userId) {
        throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email is already in use')
      }
    }
    updateData.email = normalizedEmail
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No fields provided for update')
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    returnDocument: 'after',
  }).lean()

  if (!updatedUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  const userRecord = updatedUser as Record<string, unknown>
  if (!userRecord.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized')
  }

  return toAuthUser(updatedUser)
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash').lean()

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  const userRecord = user as Record<string, unknown>
  if (!userRecord.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized')
  }

  const currentPasswordHash = userRecord.passwordHash as string
  const isValid = await verifyPassword(input.currentPassword, currentPasswordHash)
  if (!isValid) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Incorrect current password')
  }

  const newPasswordHash = await hashPassword(input.newPassword)
  await User.findByIdAndUpdate(userId, { passwordHash: newPasswordHash })
}
