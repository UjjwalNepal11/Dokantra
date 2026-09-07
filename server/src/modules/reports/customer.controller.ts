import { Request, Response } from 'express'
import { getCustomerReport as getCustomerReportData } from './report.service.js'
import { CustomerReportSchema } from './report.validation.js'

export async function getCustomerReport(req: Request, res: Response): Promise<void> {
  const query = CustomerReportSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await getCustomerReportData(businessId, query.startDate, query.endDate, query.limit)

  res.status(200).json({
    success: true,
    data,
  })
}
