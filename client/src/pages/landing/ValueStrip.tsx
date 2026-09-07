import { Store, Package, Receipt, Users, FileText } from 'lucide-react'

const VALUES = [
  {
    icon: Store,
    title: 'Manage Everything in One Place',
    description: 'Products, inventory, sales, and customers in one platform.',
  },
  {
    icon: Package,
    title: 'Track Your Inventory',
    description: 'Monitor stock levels and know what needs restocking.',
  },
  {
    icon: Receipt,
    title: 'Monitor Sales & Expenses',
    description: 'Track revenue and costs to understand your business.',
  },
  {
    icon: Users,
    title: 'Keep Customer Records',
    description: 'Store customer info and view purchase history.',
  },
  {
    icon: FileText,
    title: 'Generate Professional Invoices',
    description: 'Create, print, and download clean invoices.',
  },
]

export default function ValueStrip() {
  return (
    <section className="border-y bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {VALUES.map((item) => (
            <div
              key={item.title}
              className="group flex flex-col items-center text-center gap-2.5 sm:gap-3 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold">{item.title}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
