import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { getSessionStateManager } from '../../lib/sessionStateManager'
import { updatePageTitle, setCanonical, updateMetaTag } from '../../lib/seo'

interface AppShellProps {
  children?: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    let pageTitle = 'Dokantra'

    if (path === '/dashboard') {
      pageTitle = 'Dashboard | Dokantra'
    } else if (path.startsWith('/sales')) {
      pageTitle = 'Sales | Dokantra'
    } else if (path.startsWith('/products')) {
      pageTitle = 'Products | Dokantra'
    } else if (path === '/inventory') {
      pageTitle = 'Inventory | Dokantra'
    } else if (path.startsWith('/customers')) {
      pageTitle = 'Customers | Dokantra'
    } else if (path.startsWith('/expenses')) {
      pageTitle = 'Expenses | Dokantra'
    } else if (path === '/categories') {
      pageTitle = 'Categories | Dokantra'
    } else if (path === '/settings') {
      pageTitle = 'Settings | Dokantra'
    } else if (path === '/notifications') {
      pageTitle = 'Notifications | Dokantra'
    }

    updatePageTitle(title ?? pageTitle)
    const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin
    setCanonical(`${baseUrl}${path}`)
    updateMetaTag('robots', 'noindex, nofollow')
  }, [location.pathname, title])

  useEffect(() => {
    const manager = getSessionStateManager({
      scrollContainer: window,
      debounceMs: 150,
      maxAge: 300000,
    })

    return () => {
      manager.destroy()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main key={location.pathname} className="pt-16 p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  )
}
