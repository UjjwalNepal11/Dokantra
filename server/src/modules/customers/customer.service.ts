import mongoose from 'mongoose'
import { Customer } from './customer.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { createNotificationIfNotExists } from '../notifications/notification.service.js'

export type CustomerResponse = {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCustomerInput = {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export type UpdateCustomerInput = {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive?: boolean
}

function toCustomerResponse(customer: {
  _id: mongoose.Types.ObjectId
  businessId: mongoose.Types.ObjectId
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): CustomerResponse {
  return {
    id: customer._id.toString(),
    name: customer.name,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    notes: customer.notes ?? undefined,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function createCustomer(
  businessId: string,
  input: CreateCustomerInput,
): Promise<CustomerResponse> {
  const customer = await Customer.create({
    businessId: new mongoose.Types.ObjectId(businessId),
    name: input.name,
    phone: input.phone?.trim() ?? undefined,
    email: input.email?.trim().toLowerCase() ?? undefined,
    address: input.address?.trim() ?? undefined,
    notes: input.notes?.trim() ?? undefined,
  })

  await createNotificationIfNotExists(businessId, {
    type: 'CUSTOMER_CREATED',
    title: 'New Customer',
    message: `${input.name} was added as a customer.`,
    severity: 'INFO',
    relatedEntityType: 'CUSTOMER',
    relatedEntityId: customer._id.toString(),
  })

  return toCustomerResponse(customer)
}

export async function getCustomerById(
  businessId: string,
  customerId: string,
): Promise<CustomerResponse> {
  const customer = await Customer.findOne({
    _id: new mongoose.Types.ObjectId(customerId),
    businessId: new mongoose.Types.ObjectId(businessId),
  }).lean()

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found')
  }

  return toCustomerResponse(customer)
}

export async function listCustomers(
  businessId: string,
  params: {
    search?: string
    includeInactive?: boolean
  },
): Promise<CustomerResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (params.includeInactive) {
    delete query.isActive
  } else {
    query.isActive = true
  }

  if (params.search) {
    const searchRegex = new RegExp(escapeRegex(params.search.trim()), 'i')
    query.$or = [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }]
  }

  const customers = await Customer.find(query).sort({ name: 1 }).lean()

  return customers.map(toCustomerResponse)
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerResponse> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name.trim()
  }

  if (input.phone !== undefined) {
    updateData.phone = input.phone?.trim() ?? null
  }

  if (input.email !== undefined) {
    updateData.email = input.email?.trim().toLowerCase() ?? null
  }

  if (input.address !== undefined) {
    updateData.address = input.address?.trim() ?? null
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes?.trim() ?? null
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No fields provided for update')
  }

  const customer = await Customer.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(customerId),
      businessId: new mongoose.Types.ObjectId(businessId),
    },
    updateData,
    { returnDocument: 'after' },
  ).lean()

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found')
  }

  return toCustomerResponse(customer)
}

export async function deactivateCustomer(businessId: string, customerId: string): Promise<void> {
  const customer = await Customer.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(customerId),
      businessId: new mongoose.Types.ObjectId(businessId),
    },
    { isActive: false },
    { returnDocument: 'after' },
  ).lean()

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found')
  }
}
