import mongoose from 'mongoose'
import { Sale, Counter } from './index.js'
import { Product } from '../products/product.model.js'
import { Customer } from '../customers/customer.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { reduceStockForSale, restoreStockForReturn } from '../inventory/inventory.service.js'
import { createNotificationIfNotExists } from '../notifications/notification.service.js'

export type SaleItemInput = {
  productId: string
  quantity: number
}

export type CreateSaleInput = {
  customerId?: string
  items: SaleItemInput[]
  discount: number
  tax: number
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other'
  paymentStatus: 'paid' | 'unpaid' | 'partial'
}

export type SaleItemResponse = {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  unitCost: number
  subtotal: number
}

export type SaleResponse = {
  id: string
  customerId?: string
  customerName?: string
  createdBy: string
  invoiceNumber: string
  items: SaleItemResponse[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  paymentStatus: string
  status: string
  soldAt: string
  createdAt: string
  updatedAt: string
}

export type ListSalesParams = {
  customerId?: string
  paymentStatus?: string
  paymentMethod?: string
  status?: string
  startDate?: string
  endDate?: string
}

function toSaleItemResponse(item: {
  productId: mongoose.Types.ObjectId
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  unitCost: number
  subtotal: number
}): SaleItemResponse {
  return {
    productId: item.productId.toString(),
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    subtotal: item.subtotal,
  }
}

function toSaleResponse(
  sale: {
    _id: mongoose.Types.ObjectId
    customerId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string } | null
    createdBy: mongoose.Types.ObjectId
    invoiceNumber: string
    items: {
      productId: mongoose.Types.ObjectId
      productName: string
      sku: string
      quantity: number
      unitPrice: number
      unitCost: number
      subtotal: number
    }[]
    subtotal: number
    discount: number
    tax: number
    total: number
    paymentMethod: string
    paymentStatus: string
    status: string
    soldAt: Date
    createdAt: Date
    updatedAt: Date
  },
  customerName?: string,
): SaleResponse {
  let resolvedCustomerId: string | undefined
  let resolvedCustomerName: string | undefined

  if (sale.customerId) {
    const populated = sale.customerId as
      mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string }
    if (typeof populated === 'object' && '_id' in populated) {
      resolvedCustomerId = (
        populated as { _id: mongoose.Types.ObjectId; name: string }
      )._id.toString()
      resolvedCustomerName = (populated as { _id: mongoose.Types.ObjectId; name: string }).name
    } else {
      resolvedCustomerId = (populated as mongoose.Types.ObjectId).toString()
    }
  }

  return {
    id: sale._id.toString(),
    customerId: resolvedCustomerId,
    customerName: customerName ?? resolvedCustomerName,
    createdBy: sale.createdBy.toString(),
    invoiceNumber: sale.invoiceNumber,
    items: sale.items.map(toSaleItemResponse),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    status: sale.status,
    soldAt: sale.soldAt.toISOString(),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  }
}

export async function createSale(
  businessId: string,
  userId: string,
  input: CreateSaleInput,
): Promise<SaleResponse> {
  const session = await mongoose.startSession()

  try {
    let result: SaleResponse | null = null

    await session.withTransaction(async () => {
      const aggregated = new Map<string, number>()
      for (const item of input.items) {
        aggregated.set(item.productId, (aggregated.get(item.productId) || 0) + item.quantity)
      }

      const uniqueItems = Array.from(aggregated.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }))

      if (input.customerId) {
        if (!mongoose.Types.ObjectId.isValid(input.customerId)) {
          throw new AppError(400, 'INVALID_CUSTOMER_ID', 'Invalid customer ID format')
        }

        const customer = await Customer.findOne({
          _id: new mongoose.Types.ObjectId(input.customerId),
          businessId: new mongoose.Types.ObjectId(businessId),
          isActive: true,
        }).session(session)

        if (!customer) {
          throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found or inactive')
        }
      }

      const productIds = uniqueItems.map((item) => new mongoose.Types.ObjectId(item.productId))
      const products = await Product.find({
        _id: { $in: productIds },
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
      }).session(session)

      if (products.length !== productIds.length) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One or more products not found or inactive')
      }

      const productMap = new Map(products.map((product) => [product._id.toString(), product]))

      const saleItems: SaleItemResponse[] = []
      let subtotal = 0

      for (const item of uniqueItems) {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
        }

        if (product.stockQuantity < item.quantity) {
          throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`)
        }

        const unitPrice = product.sellingPrice
        const unitCost = product.costPrice
        const itemSubtotal = item.quantity * unitPrice

        saleItems.push({
          productId: item.productId,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          unitCost,
          subtotal: itemSubtotal,
        })

        subtotal += itemSubtotal
      }

      const discount = input.discount
      const tax = input.tax

      if (discount > subtotal) {
        throw new AppError(400, 'INVALID_DISCOUNT', 'Discount cannot exceed subtotal')
      }

      const total = subtotal - discount + tax

      if (total < 0) {
        throw new AppError(400, 'INVALID_TOTAL', 'Total cannot be negative')
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: `sale_invoice_${businessId}` },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, session },
      )

      const invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`

      const [sale] = await Sale.create(
        [
          {
            businessId: new mongoose.Types.ObjectId(businessId),
            customerId: input.customerId
              ? new mongoose.Types.ObjectId(input.customerId)
              : undefined,
            createdBy: new mongoose.Types.ObjectId(userId),
            invoiceNumber,
            items: saleItems,
            subtotal,
            discount,
            tax,
            total,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus,
            status: 'completed',
            soldAt: new Date(),
          },
        ],
        { session },
      )

      const saleId = sale._id.toString()

      for (const item of saleItems) {
        await reduceStockForSale(businessId, userId, item.productId, item.quantity, saleId, session)
      }

      const customerName = input.customerId
        ? (await Customer.findById(input.customerId).select('name').lean())?.name
        : undefined

      await createNotificationIfNotExists(businessId, {
        type: 'SALE_COMPLETED',
        title: 'Sale Completed',
        message: `Invoice ${invoiceNumber} was completed for NPR ${total.toFixed(2)}.`,
        severity: 'SUCCESS',
        recipientId: userId,
        relatedEntityType: 'SALE',
        relatedEntityId: sale._id.toString(),
        metadata: {
          invoiceNumber,
          total,
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod,
        },
      })

      if (input.paymentStatus === 'unpaid' || input.paymentStatus === 'partial') {
        await createNotificationIfNotExists(businessId, {
          type: 'PAYMENT_DUE',
          title: 'Payment Due',
          message: customerName
            ? `${customerName} has an outstanding balance on invoice ${invoiceNumber}.`
            : `An outstanding balance remains on invoice ${invoiceNumber}.`,
          severity: 'WARNING',
          recipientId: userId,
          relatedEntityType: 'SALE',
          relatedEntityId: sale._id.toString(),
          metadata: {
            invoiceNumber,
            customerName,
            paymentStatus: input.paymentStatus,
          },
        })
      }

      result = toSaleResponse(sale, customerName)
    })

    if (!result) {
      throw new AppError(500, 'TRANSACTION_FAILED', 'Sale creation failed')
    }

    return result
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(500, 'TRANSACTION_FAILED', 'Sale creation failed. Please retry.')
  } finally {
    await session.endSession()
  }
}

export async function getSaleById(businessId: string, saleId: string): Promise<SaleResponse> {
  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new AppError(400, 'INVALID_SALE_ID', 'Invalid sale ID format')
  }

  const sale = await Sale.findOne({
    _id: new mongoose.Types.ObjectId(saleId),
    businessId: new mongoose.Types.ObjectId(businessId),
  })
    .populate('customerId', 'name')
    .lean()

  if (!sale) {
    throw new AppError(404, 'SALE_NOT_FOUND', 'Sale not found')
  }

  return toSaleResponse(sale as Parameters<typeof toSaleResponse>[0])
}

export async function listSales(
  businessId: string,
  params: ListSalesParams,
): Promise<SaleResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (params.customerId) {
    if (!mongoose.Types.ObjectId.isValid(params.customerId)) {
      throw new AppError(400, 'INVALID_CUSTOMER_ID', 'Invalid customer ID format')
    }
    query.customerId = new mongoose.Types.ObjectId(params.customerId)
  }

  if (params.paymentStatus) {
    query.paymentStatus = params.paymentStatus
  }

  if (params.paymentMethod) {
    query.paymentMethod = params.paymentMethod
  }

  if (params.status) {
    query.status = params.status
  }

  if (params.startDate || params.endDate) {
    const dateQuery: Record<string, unknown> = {}
    if (params.startDate) {
      dateQuery.$gte = new Date(params.startDate)
    }
    if (params.endDate) {
      dateQuery.$lte = new Date(params.endDate)
    }
    query.soldAt = dateQuery
  }

  const sales = await Sale.find(query).sort({ soldAt: -1 }).populate('customerId', 'name').lean()

  return sales.map((sale) => toSaleResponse(sale as Parameters<typeof toSaleResponse>[0]))
}

export async function cancelSale(
  businessId: string,
  userId: string,
  saleId: string,
): Promise<void> {
  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: new mongoose.Types.ObjectId(saleId),
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'completed',
      }).session(session)

      if (!sale) {
        throw new AppError(404, 'SALE_NOT_FOUND', 'Sale not found or already cancelled')
      }

      for (const item of sale.items) {
        await restoreStockForReturn(
          businessId,
          userId,
          item.productId.toString(),
          item.quantity,
          saleId,
          session,
        )
      }

      const updatedSale = await Sale.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(saleId),
          businessId: new mongoose.Types.ObjectId(businessId),
          status: 'completed',
        },
        { $set: { status: 'cancelled' } },
        { session, returnDocument: 'after' },
      )

      if (!updatedSale) {
        throw new AppError(
          400,
          'SALE_ALREADY_CANCELLED',
          'Sale is already cancelled or was modified concurrently',
        )
      }
    })
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(500, 'TRANSACTION_FAILED', 'Sale cancellation failed. Please retry.')
  } finally {
    await session.endSession()
  }
}
