import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Menu, X } from 'lucide-react'
import { useAuth, useTheme } from '../../app/providers'
import { ThemeToggle } from '../../components/theme/ThemeToggle'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Benefits', href: '#benefits' },
]

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'

  useEffect(() => {
    if (!mobileOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setMobileOpen(false)
      }
    }

    const handleScroll = () => {
      setMobileOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    window.addEventListener('scroll', handleScroll, true)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
      window.removeEventListener('scroll', handleScroll, true)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const handleHomeClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            onClick={handleHomeClick}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            aria-label="Dokantra Home"
          >
            <img src={logoSrc} alt="Dokantra" className="h-8 w-auto object-contain rounded-r-md" />
            <span className="text-xl font-bold text-primary">Dokantra</span>
          </Link>

          <nav
            className="hidden md:flex md:items-center md:gap-6 lg:gap-8"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => {
              if (link.href === '/') {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={link.href === '/' ? handleHomeClick : undefined}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                )
              }
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          <div className="hidden md:flex md:items-center md:gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button variant="secondary" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-md" aria-hidden="true" />
          <div
            ref={sidebarRef}
            className="fixed inset-y-0 right-0 z-[120] w-[70vw] sm:w-64 border-l-2 border-l-white shadow-2xl animate-slide-in-right pointer-events-auto bg-background"
          >
            <div className="flex items-center justify-between h-16 px-6 border-b">
              <span className="text-lg font-bold text-primary">Menu</span>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="p-4 space-y-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                if (link.href === '/') {
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="block rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => {
                        if (link.href === '/') handleHomeClick()
                        setMobileOpen(false)
                      }}
                    >
                      {link.label}
                    </Link>
                  )
                }
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              })}
              <div className="pt-4 mt-4 border-t space-y-2">
                {isAuthenticated ? (
                  <Button className="w-full justify-start" asChild>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" asChild>
                      <Link to="/register" onClick={() => setMobileOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
