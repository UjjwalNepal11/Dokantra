import { Request, Response } from 'express'
import { getCurrentBusiness, updateCurrentBusiness } from './business.service.js'
import { UpdateBusinessSchema } from '@dokantra/shared'

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = (req as unknown as { user?: { userId: string } }).user?.userId as string
  const businessId = (req as unknown as { businessContext?: { businessId: string } })
    .businessContext?.businessId as string
  const business = await getCurrentBusiness(userId, businessId)

  res.status(200).json({
    success: true,
    data: {
      business,
    },
  })
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = (req as unknown as { user?: { userId: string } }).user?.userId as string
  const businessId = (req as unknown as { businessContext?: { businessId: string } })
    .businessContext?.businessId as string
  const input = UpdateBusinessSchema.parse(req.body)
  const business = await updateCurrentBusiness(userId, businessId, input)

  res.status(200).json({
    success: true,
    data: {
      business,
    },
  })
}

