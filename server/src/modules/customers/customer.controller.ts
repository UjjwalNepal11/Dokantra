import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { AppError } from '../../middleware/error-handler.js'
import {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deactivateCustomer,
} from './customer.service.js'
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ListCustomersSchema,
} from './customer.validation.js'

function validateObjectId(id: string, fieldName: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_CUSTOMER_ID', `Invalid ${fieldName}`)
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = CreateCustomerSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const customer = await createCustomer(businessId, input)

  res.status(201).json({
    success: true,
    data: customer,
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListCustomersSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const customers = await listCustomers(businessId, query)

  res.status(200).json({
    success: true,
    data: customers,
  })
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  validateObjectId(id, 'customer ID')
  const businessId = req.businessContext!.businessId
  const customer = await getCustomerById(businessId, id)

  res.status(200).json({
    success: true,
    data: customer,
  })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  validateObjectId(id, 'customer ID')
  const input = UpdateCustomerSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const customer = await updateCustomer(businessId, id, input)

  res.status(200).json({
    success: true,
    data: customer,
  })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  validateObjectId(id, 'customer ID')
  const businessId = req.businessContext!.businessId
  await deactivateCustomer(businessId, id)

  res.status(200).json({
    success: true,
    data: null,
  })
}
