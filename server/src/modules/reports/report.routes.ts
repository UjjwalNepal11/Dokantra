import { Router } from 'express'
import { getSalesTrendReport } from './sales.controller.js'
import { getExpenseReport } from './expense.controller.js'
import { getTopProductsReport } from './top-products.controller.js'
import { getLowStockReport } from './low-stock.controller.js'
import { getCustomerReport } from './customer.controller.js'
import { authenticate } from '../../middleware/auth.js'
import { requireBusinessContext, requireRoles } from '../../middleware/authorize.js'
import { asyncHandler } from '../../middleware/async-handler.js'

const router = Router()

router.get(
  '/sales',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(getSalesTrendReport),
)

router.get(
  '/expenses',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(getExpenseReport),
)

router.get(
  '/top-products',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(getTopProductsReport),
)

router.get(
  '/low-stock',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager', 'staff'),
  asyncHandler(getLowStockReport),
)

router.get(
  '/customers',
  authenticate,
  requireBusinessContext,
  requireRoles('owner', 'manager'),
  asyncHandler(getCustomerReport),
)

export default router
