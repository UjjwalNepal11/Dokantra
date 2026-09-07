import { Request, Response } from 'express'
import { getTopProducts } from './report.service.js'
import { TopProductsSchema } from './report.validation.js'

export async function getTopProductsReport(req: Request, res: Response): Promise<void> {
  const query = TopProductsSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await getTopProducts(businessId, query.startDate, query.endDate, query.limit)

  res.status(200).json({
    success: true,
    data,
  })
}
