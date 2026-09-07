import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { Button } from '../../components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function CTASection() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-primary px-6 py-12 sm:px-10 sm:py-16 lg:py-20 text-center overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary-foreground">
              Run Your Shop Smarter
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Bring your products, sales, inventory, customers, and expenses together with
              Dokantra.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {isAuthenticated ? (
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/register">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
