import { Request, Response } from 'express'
import { getDashboardSummary } from './dashboard.service.js'
import { DashboardDateRangeSchema } from './dashboard.validation.js'

export async function getSummary(req: Request, res: Response): Promise<void> {
  const query = DashboardDateRangeSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const role = req.businessContext!.role
  const data = await getDashboardSummary(businessId, role, query.startDate, query.endDate)

  res.status(200).json({
    success: true,
    data,
  })
}
