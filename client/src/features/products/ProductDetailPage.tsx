import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { ProductDetail } from './components/ProductDetail'
import { ProductForm } from './components/ProductForm'
import { ConfirmDeactivateDialog } from './components/ConfirmDeactivateDialog'
import { useProduct } from './hooks/useProduct'
import { useCategories } from './hooks/useCategories'
import { useUpdateProduct } from './hooks/useUpdateProduct'
import { useDeactivateProduct } from './hooks/useDeactivateProduct'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Button } from '../../components/ui/button'
import type { ProductResponse } from '@dokantra/shared'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { businessContext } = useAuth()
  const { data: product, isLoading, isError, error, refetch } = useProduct(id || '')
  const { data: categories } = useCategories()

  const updateMutation = useUpdateProduct()
  const deactivateMutation = useDeactivateProduct()

  const [formOpen, setFormOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<ProductResponse | null>(null)

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  const handleUpdate = async (values: unknown) => {
    if (!product) return
    await updateMutation.mutateAsync({
      id: product.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
    setFormOpen(false)
  }

  const handleDeactivate = async () => {
    if (!deletingProduct) return
    try {
      await deactivateMutation.mutateAsync(deletingProduct.id)
      setDeletingProduct(null)
      navigate('/products')
    } catch {
      // error is handled by mutation state
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/products')}>
          ← Back to Products
        </Button>
        <ErrorState
          title="Product not found"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load this product. It may have been removed or you may not have access to it."
              : 'The product you are looking for does not exist or has been deactivated.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/products')}>
          ← Back to Products
        </Button>
        {canModify && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              Edit Product
            </Button>
            {product.isActive && (
              <Button
                variant="destructive"
                onClick={() => setDeletingProduct(product)}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </Button>
            )}
          </div>
        )}
      </div>
      <ProductDetail
        open
        onOpenChange={(open) => !open && navigate('/products')}
        product={product}
        categories={categories}
        onEdit={canModify ? () => setFormOpen(true) : undefined}
      />

      <ProductForm
        open={formOpen}
        onOpenChange={(open) => !open && setFormOpen(false)}
        product={product}
        mode="edit"
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />

      <ConfirmDeactivateDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        product={deletingProduct}
        onConfirm={handleDeactivate}
        isDeactivating={deactivateMutation.isPending}
      />
    </div>
  )
}

