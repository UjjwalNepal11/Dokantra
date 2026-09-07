import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'

interface ConfirmDeactivateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: { id: string; name: string } | null
  onConfirm: () => void
  isDeactivating?: boolean
}

export function ConfirmDeactivateDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  isDeactivating = false,
}: ConfirmDeactivateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate product?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate &quot;{product?.name}&quot;. The product will be hidden from active
            listings, but historical sales and inventory records will remain intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeactivating}>
            {isDeactivating ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
