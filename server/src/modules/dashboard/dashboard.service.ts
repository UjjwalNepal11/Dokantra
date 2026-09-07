import mongoose from 'mongoose'
import { Sale } from '../sales/sale.model.js'
import { Expense } from '../expenses/expense.model.js'
import { Product } from '../products/product.model.js'
import { Customer } from '../customers/customer.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { DashboardSummary } from './dashboard.types.js'

function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const now = new Date()
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  )
  return { startDate, endDate }
}

function resolveDateRange(
  startDate?: string,
  endDate?: string,
): { startDate: Date; endDate: Date } {
  const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDateRange()
  const start = startDate ? new Date(startDate) : defaultStart
  const end = endDate ? new Date(endDate) : defaultEnd

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError(400, 'INVALID_DATE_FORMAT', 'startDate and endDate must be valid ISO dates')
  }

  if (startDate) {
    start.setHours(0, 0, 0, 0)
  }
  if (endDate) {
    end.setHours(23, 59, 59, 999)
  }

  if (start > end) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'startDate must not be later than endDate')
  }

  return { startDate: start, endDate: end }
}

export async function getDashboardSummary(
  businessId: string,
  role: 'owner' | 'manager' | 'staff',
  startDate?: string,
  endDate?: string,
): Promise<DashboardSummary> {
  const { startDate: start, endDate: end } = resolveDateRange(startDate, endDate)

  const [salesResult, expensesResult, totalProducts, lowStockProducts, totalCustomers] =
    await Promise.all([
      Sale.aggregate([
        {
          $match: {
            businessId: new mongoose.Types.ObjectId(businessId),
            status: 'completed',
            soldAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            businessId: new mongoose.Types.ObjectId(businessId),
            expenseDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
          },
        },
      ]),
      Product.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
      }),
      Product.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      }),
      Customer.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
      }),
    ])

  const totalSales = salesResult.length > 0 ? salesResult[0].totalSales : 0
  const totalRevenue = salesResult.length > 0 ? salesResult[0].totalRevenue : 0
  const totalExpenses = expensesResult.length > 0 ? expensesResult[0].totalExpenses : 0

  const isStaff = role === 'staff'

  return {
    totalSales,
    totalRevenue: isStaff ? 0 : totalRevenue,
    totalExpenses: isStaff ? 0 : totalExpenses,
    estimatedProfit: isStaff ? 0 : totalRevenue - totalExpenses,
    totalOrders: totalSales,
    totalProducts,
    lowStockProducts,
    totalCustomers,
  }
}
