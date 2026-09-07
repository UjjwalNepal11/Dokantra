import { Monitor, ShoppingCart, BarChart3 } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Monitor,
    title: 'Set Up Your Business',
    description: 'Create your account and configure your business information to get started.',
  },
  {
    number: '02',
    icon: ShoppingCart,
    title: 'Manage Your Shop',
    description:
      'Add products, manage inventory, customers, sales, and expenses from one dashboard.',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Understand Your Business',
    description: 'Use the dashboard, reports, invoices, and insights to make better decisions.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-y bg-muted/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Get up and running in three simple steps.
          </p>
        </div>
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative text-center group">
              {index < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute top-7 sm:top-8 left-[calc(50%+2rem)] right-[calc(-50%+1rem)] h-0.5 bg-gradient-to-r from-primary/30 to-primary/10"
                  aria-hidden="true"
                />
              )}
              <div className="mx-auto mb-5 sm:mb-6 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                <step.icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                Step {step.number}
              </span>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 sm:mt-3 text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
