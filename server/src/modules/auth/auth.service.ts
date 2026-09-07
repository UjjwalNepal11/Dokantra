import { randomUUID } from 'crypto'
import { User } from '../users/index.js'
import { Business } from '../businesses/index.js'
import { BusinessMember } from '../business-members/index.js'
import { Session } from '../sessions/index.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { generateAccessToken } from '../../lib/tokens.js'
import { generateRawRefreshToken, hashRefreshToken } from '../../lib/refresh.js'
import { env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import mongoose from 'mongoose'

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
  businessContext?: {
    businessId: string
    membershipId: string
    role: 'owner' | 'manager' | 'staff'
  }
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

async function createSession(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken)
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiresMs)

  await Session.create({
    userId: new mongoose.Types.ObjectId(userId),
    tokenHash,
    expiresAt,
  })
}

async function issueTokens(userId: string): Promise<AuthTokens> {
  const refreshToken = generateRawRefreshToken()
  const accessToken = generateAccessToken({ userId, tokenType: 'access' })
  await createSession(userId, refreshToken)
  return { accessToken, refreshToken }
}

export async function register(input: {
  firstName: string
  lastName: string
  email: string
  password: string
  businessName: string
}): Promise<AuthResult> {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() }).lean()
  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email is already registered')
  }

  const passwordHash = await hashPassword(input.password)

  const session = await mongoose.startSession()

  try {
    let userDoc: {
      _id: mongoose.Types.ObjectId
      firstName: string
      lastName: string
      email: string
    } = {
      _id: new mongoose.Types.ObjectId(),
      firstName: '',
      lastName: '',
      email: '',
    }
    let businessDoc: {
      _id: mongoose.Types.ObjectId
      name: string
      slug: string
      ownerId: mongoose.Types.ObjectId
    } = {
      _id: new mongoose.Types.ObjectId(),
      name: '',
      slug: '',
      ownerId: new mongoose.Types.ObjectId(),
    }

    await session.withTransaction(async () => {
      userDoc = (
        await User.create(
          [
            {
              firstName: input.firstName.trim(),
              lastName: input.lastName.trim(),
              email: input.email.toLowerCase().trim(),
              passwordHash,
            },
          ],
          { session },
        )
      )[0]

      businessDoc = (
        await Business.create(
          [
            {
              name: input.businessName.trim(),
              slug: `${input.businessName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}`,
              ownerId: userDoc._id,
            },
          ],
          { session },
        )
      )[0]

      await BusinessMember.create(
        [
          {
            businessId: businessDoc._id,
            userId: userDoc._id,
            role: 'owner',
            status: 'active',
          },
        ],
        { session },
      )
    })

    const tokens = await issueTokens(userDoc._id.toString())

    const membership = await BusinessMember.findOne({
      userId: new mongoose.Types.ObjectId(userDoc._id.toString()),
      businessId: businessDoc._id,
    }).lean()

    return {
      user: toAuthUser(userDoc),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      businessContext: membership
        ? {
            businessId: businessDoc._id.toString(),
            membershipId: (
              membership as unknown as { _id: mongoose.Types.ObjectId }
            )._id.toString(),
            role: membership.role as 'owner' | 'manager' | 'staff',
          }
        : undefined,
    }
  } catch (error) {
    throw error
  } finally {
    await session.endSession()
  }
}

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash')

  if (!user || !user.isActive) {
    try {
      await verifyPassword(input.password, '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash')
    } catch {
      // Expected to fail; dummy hash is intentionally invalid
    }
    throw new AppError(401, 'AUTHENTICATION_FAILED', 'Invalid credentials')
  }

  const isValid = await verifyPassword(input.password, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'AUTHENTICATION_FAILED', 'Invalid credentials')
  }

  const tokens = await issueTokens(user._id.toString())

  const membership = await BusinessMember.findOne({
    userId: new mongoose.Types.ObjectId(user._id.toString()),
    status: 'active',
  }).lean()

  return {
    user: toAuthUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    businessContext: membership
      ? {
          businessId: (
            membership as unknown as { businessId: mongoose.Types.ObjectId }
          ).businessId.toString(),
          membershipId: (membership as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          role: membership.role as 'owner' | 'manager' | 'staff',
        }
      : undefined,
  }
}

export async function refreshAccessToken(
  rawRefreshToken: string,
): Promise<{ accessToken: string }> {
  const tokenHash = hashRefreshToken(rawRefreshToken)
  const session = await Session.findOne({ tokenHash, revokedAt: null })

  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.')
  }

  const accessToken = generateAccessToken({
    userId: session.userId.toString(),
    tokenType: 'access',
  })
  return { accessToken }
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<AuthTokens> {
  const tokenHash = hashRefreshToken(rawRefreshToken)
  const session = await Session.findOne({ tokenHash, revokedAt: null })

  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.')
  }

  session.revokedAt = new Date()
  await session.save()

  const newRefreshToken = generateRawRefreshToken()
  const accessToken = generateAccessToken({
    userId: session.userId.toString(),
    tokenType: 'access',
  })
  await createSession(session.userId.toString(), newRefreshToken)

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return
  }

  const tokenHash = hashRefreshToken(rawRefreshToken)
  await Session.findOneAndUpdate({ tokenHash, revokedAt: null }, { revokedAt: new Date() })
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId)
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.')
  }
  return toAuthUser(user)
}
