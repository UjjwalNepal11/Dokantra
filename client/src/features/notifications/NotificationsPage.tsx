import { useMemo } from 'react'
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type {
  NotificationResponse,
  NotificationSeverity,
  RelatedEntityType,
} from '@dokantra/shared'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from './hooks/useNotifications'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { cn } from '../../lib/utils'

const severityConfig: Record<
  NotificationSeverity,
  { icon: typeof Info; color: string; bg: string; border: string }
> = {
  INFO: { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  SUCCESS: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  ERROR: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
  },
}

const entityPaths: Record<string, string> = {
  PRODUCT: '/products',
  CUSTOMER: '/customers',
  SALE: '/sales',
  EXPENSE: '/expenses',
}

function getEntityLabel(type?: RelatedEntityType): string {
  switch (type) {
    case 'PRODUCT':
      return 'Product'
    case 'CUSTOMER':
      return 'Customer'
    case 'SALE':
      return 'Sale'
    case 'EXPENSE':
      return 'Expense'
    default:
      return ''
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useNotifications({ page: 1, limit: 50 })
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const deleteNotification = useDeleteNotification()

  const notifications = useMemo<NotificationResponse[]>(() => data?.items ?? [], [data?.items])

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead), [notifications])

  const totalUnread = unreadNotifications.length

  const handleNotificationClick = (notification: NotificationResponse) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id)
    }
    const entityType = notification.relatedEntityType
    const entityId = notification.relatedEntityId
    if (entityType && entityId) {
      const path = entityPaths[entityType]
      if (path) {
        navigate(`${path}/${entityId}`)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load notifications"
        description="Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title="No notifications" description="You are all caught up." />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {totalUnread > 0
              ? `You have ${totalUnread} unread notification${totalUnread !== 1 ? 's' : ''}.`
              : 'All notifications are read.'}
          </p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="rounded-lg border divide-y">
        {notifications.map((notification) => {
          const config = severityConfig[notification.severity]
          const Icon = config.icon
          const href =
            notification.relatedEntityType && notification.relatedEntityId
              ? `${entityPaths[notification.relatedEntityType]}/${notification.relatedEntityId}`
              : null

          return (
            <div
              key={notification.id}
              className={cn(
                'flex gap-3 sm:gap-4 p-3 sm:p-4 transition-colors',
                !notification.isRead && 'bg-primary/5',
                href && 'cursor-pointer hover:bg-accent/50',
              )}
              onClick={() => handleNotificationClick(notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleNotificationClick(notification)
                }
              }}
            >
              <div className={cn('mt-0.5 rounded-full p-2 flex-shrink-0', config.bg)}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn('text-sm font-medium', !notification.isRead && 'font-semibold')}
                    >
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification.mutate(notification.id)
                    }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                      config.border,
                      config.bg,
                      config.color,
                    )}
                  >
                    {notification.severity}
                  </span>
                  {notification.relatedEntityType && (
                    <span className="text-xs text-muted-foreground">
                      {getEntityLabel(notification.relatedEntityType)}
                      {notification.relatedEntityId && (
                        <span className="ml-1 font-mono text-xs">
                          {notification.relatedEntityId.slice(0, 8)}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                  {!notification.isRead && (
                    <span
                      className="inline-flex h-2 w-2 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

