import { useState } from 'react'
import { useAuth } from '../../app/providers'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { Menu, LogOut } from 'lucide-react'
import { ConfirmDialog } from '../feedback/ConfirmDialog'
import { NotificationDropdown } from '../../features/notifications'
import { ThemeToggle } from '../theme/ThemeToggle'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const hideNotificationBell = location.pathname === '/notifications'

  const handleLogout = () => {
    setIsLogoutDialogOpen(false)
    logout()
    requestAnimationFrame(() => navigate('/'))
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-6">
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        {!hideNotificationBell && <NotificationDropdown />}
        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[120px] lg:max-w-[180px]">
          {user?.firstName} {user?.lastName}
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground sm:hidden truncate max-w-[80px]">
          {user?.firstName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLogoutDialogOpen(true)}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
        title="Log out"
        description="Are you sure you want to log out? You will need to sign in again to access your account."
        variant="destructive"
        confirmLabel="Log out"
        cancelLabel="Cancel"
      />
    </header>
  )
}
