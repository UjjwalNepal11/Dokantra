import { Request, Response } from 'express'
import { cancelSale, createSale, getSaleById, listSales } from './sale.service.js'
import { CreateSaleSchema, ListSalesSchema } from './sale.validation.js'

export async function create(req: Request, res: Response): Promise<void> {
  const input = CreateSaleSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const sale = await createSale(businessId, userId, input)

  res.status(201).json({
    success: true,
    data: sale,
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListSalesSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const sales = await listSales(businessId, query)

  res.status(200).json({
    success: true,
    data: sales,
  })
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  const businessId = req.businessContext!.businessId
  const sale = await getSaleById(businessId, id)

  res.status(200).json({
    success: true,
    data: sale,
  })
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  await cancelSale(businessId, userId, id)

  res.status(200).json({
    success: true,
    data: null,
  })
}
