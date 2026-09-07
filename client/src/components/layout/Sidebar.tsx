import { navigation } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { useAuth, useTheme } from '../../app/providers'
import { NavLink, useLocation, Link } from 'react-router-dom'

export function Sidebar({ className }: { className?: string }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'
  const location = useLocation()

  const primaryItems = navigation.filter((item) => item.section === 'primary')
  const secondaryItems = navigation.filter((item) => item.section === 'secondary')

  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-background border-r',
        className,
      )}
    >
      <div className="flex items-center h-16 px-4 sm:px-6 border-b">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoSrc} alt="Dokantra" className="h-8 w-auto object-contain rounded-r-md" />
          <span className="text-lg sm:text-xl font-bold text-primary">Dokantra</span>
        </Link>
      </div>
      <nav
        className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3 space-y-1"
        aria-label="Main navigation"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        })}
        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
          {secondaryItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>
    </aside>
  )
}
