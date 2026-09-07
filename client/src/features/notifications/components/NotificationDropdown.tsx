import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import type { NotificationResponse, NotificationSeverity } from '@dokantra/shared'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useUnreadNotificationCount,
} from '../hooks/useNotifications'
import { useMarkAllNotificationsAsRead, useDeleteNotification } from '../hooks/useNotifications'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'

const severityConfig: Record<
  NotificationSeverity,
  { icon: typeof Info; color: string; bg: string }
> = {
  INFO: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
  SUCCESS: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  ERROR: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
}

const entityPaths: Record<string, string> = {
  PRODUCT: '/products',
  CUSTOMER: '/customers',
  SALE: '/sales',
  EXPENSE: '/expenses',
}

function getEntityHref(notification: NotificationResponse): string | null {
  if (!notification.relatedEntityType || !notification.relatedEntityId) return null
  const base = entityPaths[notification.relatedEntityType]
  if (!base) return null
  return `${base}/${notification.relatedEntityId}`
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

interface NotificationItemProps {
  notification: NotificationResponse
  onNavigate: () => void
}

function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const navigate = useNavigate()
  const markAsRead = useMarkNotificationAsRead()
  const deleteNotification = useDeleteNotification()
  const config = severityConfig[notification.severity]
  const Icon = config.icon
  const href = getEntityHref(notification)

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id)
    }
    if (href) {
      navigate(href)
      onNavigate()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification.mutate(notification.id)
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50',
        !notification.isRead && 'bg-primary/5',
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className={cn('mt-0.5 rounded-full p-1.5', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.isRead && (
        <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />
      )}
      <button
        onClick={handleDelete}
        className="mt-1 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  const { data, isLoading, isError, refetch } = useNotifications({ page: 1, limit: 5 })
  const { data: unreadData } = useUnreadNotificationCount()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const notifications: NotificationResponse[] = data?.items ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = unreadData?.count ?? 0

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 sm:right-0 top-full z-50 mt-2 w-60 sm:w-80 rounded-md border bg-background shadow-lg max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-48 sm:max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            )}

            {isError && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Unable to load notifications.</p>
                <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <div className="p-4 sm:p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground">You are all caught up.</p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => setIsOpen(false)}
                />
              ))}
          </div>

          <div className="border-t p-2">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

