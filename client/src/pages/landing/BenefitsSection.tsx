import { Warehouse, ShoppingCart, Users, Wallet, FileText, LayoutDashboard } from 'lucide-react'

const BENEFITS = [
  {
    icon: Warehouse,
    title: 'Better Inventory Visibility',
    description:
      'Know what is available, low in stock, or out of stock so you can act before sales are impacted.',
  },
  {
    icon: ShoppingCart,
    title: 'Faster Sales Management',
    description: 'Create and manage sales efficiently with a streamlined point-of-sale experience.',
  },
  {
    icon: Users,
    title: 'Organized Customer Records',
    description: 'Keep customer information and purchase history organized in one place.',
  },
  {
    icon: Wallet,
    title: 'Better Expense Tracking',
    description: 'Understand where business money is being spent with clear expense records.',
  },
  {
    icon: FileText,
    title: 'Professional Invoices',
    description: 'Provide customers with clean, professional invoices and receipts.',
  },
  {
    icon: LayoutDashboard,
    title: 'Clear Business Overview',
    description:
      'See important business information from one dashboard without switching between tools.',
  },
]

export default function BenefitsSection() {
  return (
    <section id="benefits" className="border-y bg-muted/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Why businesses choose Dokantra
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Practical tools designed for real shop operations.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 sm:mb-4 transition-colors group-hover:bg-primary/15">
                <benefit.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
