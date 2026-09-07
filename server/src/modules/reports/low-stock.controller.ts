import { Request, Response } from 'express'
import { getLowStockReport as getLowStockReportData } from './report.service.js'

export async function getLowStockReport(req: Request, res: Response): Promise<void> {
  const businessId = req.businessContext!.businessId
  const data = await getLowStockReportData(businessId)

  res.status(200).json({
    success: true,
    data,
  })
}
