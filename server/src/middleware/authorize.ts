import { Request, Response, NextFunction } from 'express'
import { AppError } from './error-handler.js'
import { BusinessMember } from '../modules/business-members/index.js'
import { Business } from '../modules/businesses/index.js'
import mongoose from 'mongoose'

export type BusinessContext = {
  businessId: string
  membershipId: string
  role: 'owner' | 'manager' | 'staff'
}

export async function requireBusinessContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authUser = req.user
  if (!authUser) {
    return next(
      new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.'),
    )
  }

  const businessIdHeader = req.headers['x-business-id']
  if (!businessIdHeader || typeof businessIdHeader !== 'string') {
    return next(new AppError(400, 'BUSINESS_CONTEXT_REQUIRED', 'Business information is required.'))
  }

  const businessId = businessIdHeader.trim()
  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    return next(new AppError(400, 'INVALID_BUSINESS_ID', 'Invalid business ID format'))
  }

  const membership = await BusinessMember.findOne({
    businessId: new mongoose.Types.ObjectId(businessId),
    userId: new mongoose.Types.ObjectId(authUser.userId),
  })

  if (!membership) {
    return next(
      new AppError(403, 'BUSINESS_ACCESS_DENIED', 'You do not have access to this business'),
    )
  }

  if (membership.status !== 'active') {
    return next(
      new AppError(403, 'BUSINESS_ACCESS_DENIED', 'Your membership to this business is inactive'),
    )
  }

  const business = await Business.findById(membership.businessId)
  if (!business || !business.isActive) {
    return next(new AppError(403, 'BUSINESS_NOT_ACTIVE', 'This business is not active'))
  }

  req.businessContext = {
    businessId: membership.businessId.toString(),
    membershipId: membership._id.toString(),
    role: membership.role,
  }

  next()
}

export function requireRoles(...allowedRoles: Array<'owner' | 'manager' | 'staff'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ctx = req.businessContext
    if (!ctx) {
      throw new AppError(403, 'BUSINESS_CONTEXT_REQUIRED', 'Business context required')
    }

    if (!allowedRoles.includes(ctx.role)) {
      throw new AppError(403, 'FORBIDDEN', "You don't have permission to perform this action.")
    }

    next()
  }
}
