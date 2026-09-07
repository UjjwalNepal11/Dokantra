import mongoose from 'mongoose'
import { Business } from './business.model.js'
import { BusinessMember } from '../business-members/business-member.model.js'
import { AppError } from '../../middleware/error-handler.js'
import type { BusinessResponse, UpdateBusinessInput } from '@dokantra/shared'

interface LeanBusiness {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  ownerId: mongoose.Types.ObjectId
  phone?: string | null
  email?: string | null
  address?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface LeanBusinessMember {
  businessId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  role: string
  status: string
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

function toBusinessResponse(business: LeanBusiness): BusinessResponse {
  return {
    id: business._id.toString(),
    name: business.name,
    slug: business.slug,
    ownerId: business.ownerId.toString(),
    phone: business.phone ?? undefined,
    email: business.email ?? undefined,
    address: business.address ?? undefined,
    isActive: business.isActive,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  }
}

export async function getCurrentBusiness(
  userId: string,
  businessId: string,
): Promise<BusinessResponse> {
  const membership = (await BusinessMember.findOne({
    businessId: new mongoose.Types.ObjectId(businessId),
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active',
  }).lean()) as LeanBusinessMember | null

  if (!membership) {
    throw new AppError(403, 'BUSINESS_ACCESS_DENIED', 'You do not have access to this business')
  }

  const business = (await Business.findById(membership.businessId).lean()) as LeanBusiness | null
  if (!business) {
    throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found')
  }

  if (!business.isActive) {
    throw new AppError(403, 'BUSINESS_NOT_ACTIVE', 'This business is not active')
  }

  return toBusinessResponse(business)
}

export async function updateCurrentBusiness(
  userId: string,
  businessId: string,
  input: UpdateBusinessInput,
): Promise<BusinessResponse> {
  const membership = (await BusinessMember.findOne({
    businessId: new mongoose.Types.ObjectId(businessId),
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active',
  }).lean()) as LeanBusinessMember | null

  if (!membership) {
    throw new AppError(403, 'BUSINESS_ACCESS_DENIED', 'You do not have access to this business')
  }

  if (membership.role !== 'owner' && membership.role !== 'manager') {
    throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions to update business settings')
  }

  const business = await Business.findById(membership.businessId)
  if (!business) {
    throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found')
  }

  const businessRecord = business as unknown as Record<string, unknown>
  if (!businessRecord.isActive) {
    throw new AppError(403, 'BUSINESS_NOT_ACTIVE', 'This business is not active')
  }

  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name.trim()
  }

  if (input.phone !== undefined) {
    updateData.phone = input.phone?.trim() ?? null
  }

  if (input.email !== undefined) {
    updateData.email = input.email?.toLowerCase().trim() ?? null
  }

  if (input.address !== undefined) {
    updateData.address = input.address?.trim() ?? null
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No fields provided for update')
  }

  const updatedBusiness = (await Business.findByIdAndUpdate(membership.businessId, updateData, {
    returnDocument: 'after',
  }).lean()) as LeanBusiness | null

  if (!updatedBusiness) {
    throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found')
  }

  return toBusinessResponse(updatedBusiness)
}

