import mongoose from 'mongoose'
import { Sale } from '../sales/sale.model.js'
import { Expense } from '../expenses/expense.model.js'
import { Product } from '../products/product.model.js'
import { Customer } from '../customers/customer.model.js'
import { AppError } from '../../middleware/error-handler.js'
import {
  SalesTrendReport,
  ExpenseReportResponse,
  TopProductsReport,
  LowStockReport,
  CustomerReportResponse,
} from './report.types.js'
import type { PipelineStage } from 'mongoose'

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

export async function getSalesTrend(
  businessId: string,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
): Promise<SalesTrendReport> {
  const { startDate: start, endDate: end } = resolveDateRange(startDate, endDate)

  let dateFormat: string
  switch (groupBy) {
    case 'week':
      dateFormat = '%Y-%u'
      break
    case 'month':
      dateFormat = '%Y-%m'
      break
    case 'day':
    default:
      dateFormat = '%Y-%m-%d'
      break
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'completed',
        soldAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$soldAt', timezone: 'UTC' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        orders: 1,
        revenue: 1,
      },
    },
  ]

  const data = await Sale.aggregate<{ date: string; orders: number; revenue: number }>(pipeline)

  return { data }
}

export async function getExpenseReport(
  businessId: string,
  startDate?: string,
  endDate?: string,
): Promise<ExpenseReportResponse> {
  const { startDate: start, endDate: end } = resolveDateRange(startDate, endDate)

  const [totalResult, byCategoryResult] = await Promise.all([
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
          total: { $sum: '$amount' },
          count: { $sum: 1 },
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
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          amount: 1,
          count: 1,
        },
      },
    ]),
  ])

  return {
    total: totalResult.length > 0 ? totalResult[0].total : 0,
    count: totalResult.length > 0 ? totalResult[0].count : 0,
    byCategory: byCategoryResult,
  }
}

export async function getTopProducts(
  businessId: string,
  startDate?: string,
  endDate?: string,
  limit = 10,
): Promise<TopProductsReport> {
  const { startDate: start, endDate: end } = resolveDateRange(startDate, endDate)

  const data = await Sale.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'completed',
        soldAt: { $gte: start, $lte: end },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        productId: { $toString: '$_id' },
        name: 1,
        sku: 1,
        quantitySold: 1,
        revenue: 1,
      },
    },
  ])

  return { data }
}

export async function getLowStockReport(businessId: string): Promise<LowStockReport> {
  const products = await Product.find({
    businessId: new mongoose.Types.ObjectId(businessId),
    isActive: true,
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  })
    .sort({ stockQuantity: 1 })
    .lean()

  const data = products.map((product) => ({
    productId: product._id.toString(),
    name: product.name,
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
  }))

  return { data }
}

export async function getCustomerReport(
  businessId: string,
  startDate?: string,
  endDate?: string,
  limit = 10,
): Promise<CustomerReportResponse> {
  const { startDate: start, endDate: end } = resolveDateRange(startDate, endDate)

  const [totalCustomers, activeCustomers, topCustomersResult, salesWithCustomers] =
    await Promise.all([
      Customer.countDocuments({ businessId: new mongoose.Types.ObjectId(businessId) }),
      Customer.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
      }),
      Sale.aggregate([
        {
          $match: {
            businessId: new mongoose.Types.ObjectId(businessId),
            status: 'completed',
            soldAt: { $gte: start, $lte: end },
            customerId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$customerId',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            customerId: { $toString: '$_id' },
            revenue: 1,
            orders: 1,
          },
        },
      ]),
      Sale.distinct('customerId', {
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'completed',
        soldAt: { $gte: start, $lte: end },
        customerId: { $exists: true, $ne: null },
      }),
    ])

  const customerIds = topCustomersResult.map((c) => new mongoose.Types.ObjectId(c.customerId))
  const customers = await Customer.find({
    _id: { $in: customerIds },
  }).lean()

  const customerNameMap = new Map(customers.map((c) => [c._id.toString(), c.name]))

  const topCustomers = topCustomersResult.map((c) => ({
    customerId: c.customerId,
    name: customerNameMap.get(c.customerId) ?? 'Unknown',
    revenue: c.revenue,
    orders: c.orders,
  }))

  return {
    total: totalCustomers,
    active: activeCustomers,
    withSalesInPeriod: salesWithCustomers.length,
    topCustomers,
  }
}
