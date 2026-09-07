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
  customer: { id: string; name: string } | null
  onConfirm: () => void
  isDeactivating?: boolean
}

export function ConfirmDeactivateDialog({
  open,
  onOpenChange,
  customer,
  onConfirm,
  isDeactivating = false,
}: ConfirmDeactivateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate customer?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate &quot;{customer?.name}&quot;. The customer will be hidden from
            active listings, but historical records will remain intact.
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
