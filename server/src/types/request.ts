import { BusinessMemberRole } from '@dokantra/shared'

declare module 'express' {
  interface Request {
    user?: {
      userId: string
      tokenType: string
    }
    businessContext?: {
      businessId: string
      membershipId: string
      role: BusinessMemberRole
    }
  }
}

