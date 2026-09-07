import { Request, Response } from 'express'
import { getExpenseReport as getExpenseReportData } from './report.service.js'
import { ExpenseReportSchema } from './report.validation.js'

export async function getExpenseReport(req: Request, res: Response): Promise<void> {
  const query = ExpenseReportSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await getExpenseReportData(businessId, query.startDate, query.endDate)

  res.status(200).json({
    success: true,
    data,
  })
}
