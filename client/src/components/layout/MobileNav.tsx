import { cn } from '../../lib/utils'
import { navigation } from '../../lib/navigation'
import { useTheme } from '../../app/providers'
import { NavLink, useLocation } from 'react-router-dom'

interface MobileNavProps {
  isOpen?: boolean
  onClose?: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 left-0 w-[70vw] sm:w-64 bg-background border-r shadow-2xl animate-slide-in-left">
        <div className="flex items-center h-16 px-4 sm:px-6 border-b">
          <img src={logoSrc} alt="Dokantra" className="h-8 w-auto object-contain rounded-r-md mr-2" />
          <span className="text-lg sm:text-xl font-bold text-primary">Dokantra</span>
        </div>
        <nav className="p-3 sm:p-4 space-y-1" aria-label="Mobile navigation">
          {navigation
            .filter((item) => item.section === 'primary')
            .map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path))
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              )
            })}
          <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t">
            {navigation
              .filter((item) => item.section === 'secondary')
              .map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                )
              })}
          </div>
        </nav>
      </div>
    </div>
  )
}
