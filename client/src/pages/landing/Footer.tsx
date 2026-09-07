import { Link } from 'react-router-dom'
import { useTheme } from '../../app/providers'

const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Benefits', href: '#benefits' },
  ],
  account: [
    { label: 'Sign In', href: '/login' },
    { label: 'Get Started', href: '/register' },
  ],
}

export default function Footer() {
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="flex items-center gap-2 text-primary transition-opacity hover:opacity-80"
            >
              <img src={logoSrc} alt="Dokantra" className="h-5 w-auto object-contain rounded-r-md" />
              <span className="text-base sm:text-lg font-bold text-primary">Dokantra</span>
            </Link>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
              A modern shop management platform to help you run your business efficiently.
            </p>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold">Product</h3>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold">Account</h3>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              {FOOTER_LINKS.account.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold">Dokantra</h3>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Manage products, inventory, sales, customers, and expenses in one place.
            </p>
          </div>
        </div>
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t">
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
             &copy; {new Date().getFullYear()} Dokantra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
