import { Package, Warehouse, ShoppingCart, Users, Receipt, FileText, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

const FEATURES = [
  {
    icon: Package,
    title: 'Products',
    description: 'Manage product information, pricing, categories, and stock levels in one place.',
  },
  {
    icon: Warehouse,
    title: 'Inventory',
    description:
      'Monitor stock levels and identify low or out-of-stock products before they impact sales.',
  },
  {
    icon: ShoppingCart,
    title: 'Sales & POS',
    description:
      'Create sales, manage cart items, choose payment methods, and record transactions.',
  },
  {
    icon: Users,
    title: 'Customers',
    description:
      'Maintain customer information and view purchase history to build stronger relationships.',
  },
  {
    icon: Receipt,
    title: 'Expenses',
    description: 'Track business expenses and spending to understand where your money goes.',
  },
  {
    icon: FileText,
    title: 'Invoices',
    description: 'Create, view, print, and download professional invoices for your customers.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    description:
      'Understand business performance through sales, expenses, inventory, and customer insights.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Everything you need to run your shop
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            Dokantra provides the tools to manage your business operations efficiently.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border hover:border-primary/20"
            >
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 sm:mb-4 transition-colors group-hover:bg-primary/15">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
