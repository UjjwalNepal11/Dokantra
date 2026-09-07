import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { TrendingUp, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useTheme } from '../../app/providers'

function MiniMetricCard({
  title,
  value,
  change,
}: {
  title: string
  value: string
  change?: string
}) {
  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-base sm:text-lg font-bold mt-1">{value}</p>
        {change && <p className="text-xs text-success mt-1">{change}</p>}
      </CardContent>
    </Card>
  )
}

function DemoChart() {
  const data = [
    { day: 'Mon', value: 4200 },
    { day: 'Tue', value: 3800 },
    { day: 'Wed', value: 5100 },
    { day: 'Thu', value: 4600 },
    { day: 'Fri', value: 6200 },
    { day: 'Sat', value: 5800 },
    { day: 'Sun', value: 4900 },
  ]
  const max = Math.max(...data.map((d) => d.value))
  const points = data
    .map((d, i) => `${i * (100 / (data.length - 1))},${100 - (d.value / max) * 70}`)
    .join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-24 sm:h-32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chartGradientPreview" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon fill="url(#chartGradientPreview)" points={`0,100 ${points} 100,100`} />
    </svg>
  )
}

const RECENT_SALES = [
  { invoice: 'INV-001', customer: 'Ram Sharma', amount: 'NPR 4,500', status: 'Paid' },
  { invoice: 'INV-002', customer: 'Sita Rai', amount: 'NPR 2,300', status: 'Paid' },
  { invoice: 'INV-003', customer: 'Hari Thapa', amount: 'NPR 1,800', status: 'Pending' },
]

const LOW_STOCK = [
  { name: 'Wireless Mouse', stock: 2, threshold: 10 },
  { name: 'USB Cable', stock: 5, threshold: 20 },
]

export default function DashboardPreview() {
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Your business at a glance
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
            A clear overview of sales, expenses, inventory, and customers.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl blur-2xl"
            aria-hidden="true"
          />
          <Card className="relative border shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <img src={logoSrc} alt="Dokantra" className="h-5 w-auto object-contain rounded-r-md" />
                <span className="text-primary">Dokantra</span> Dashboard
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Demo Preview
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniMetricCard title="Revenue" value="NPR 124,500" change="+12.5%" />
                <MiniMetricCard title="Orders" value="48" />
                <MiniMetricCard title="Expenses" value="NPR 32,100" />
                <MiniMetricCard title="Profit" value="NPR 92,400" change="+8.2%" />
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 transition-all duration-200 hover:shadow-md">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                      Sales Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DemoChart />
                    <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4 sm:space-y-6">
                  <Card className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
                        Recent Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3">
                      {RECENT_SALES.map((sale) => (
                        <div
                          key={sale.invoice}
                          className="flex items-center justify-between text-xs sm:text-sm transition-colors hover:bg-accent/50 -mx-2 px-2 py-1 rounded"
                        >
                          <div>
                            <p className="font-medium">{sale.invoice}</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {sale.customer}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{sale.amount}</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {sale.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="transition-all duration-200 hover:shadow-md">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                        Low Stock
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {LOW_STOCK.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-xs sm:text-sm transition-colors hover:bg-accent/50 -mx-2 px-2 py-1 rounded"
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {item.stock} / {item.threshold}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <p className="text-center text-[11px] sm:text-xs text-muted-foreground pt-1 sm:pt-2">
                Illustrative UI preview — actual data depends on your account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
