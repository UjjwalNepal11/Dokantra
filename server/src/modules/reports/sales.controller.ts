import { Request, Response } from 'express'
import { getSalesTrend } from './report.service.js'
import { SalesTrendSchema } from './report.validation.js'

export async function getSalesTrendReport(req: Request, res: Response): Promise<void> {
  const query = SalesTrendSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await getSalesTrend(businessId, query.startDate, query.endDate, query.groupBy)

  res.status(200).json({
    success: true,
    data,
  })
}
