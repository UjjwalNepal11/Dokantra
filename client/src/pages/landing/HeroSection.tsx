import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  Store,
  Package,
  Warehouse,
  Users,
  Receipt,
  FileText,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../app/providers'
import { useTheme } from '../../app/providers'

const FEATURES = [
  { icon: Package, label: 'Products' },
  { icon: Warehouse, label: 'Inventory' },
  { icon: Receipt, label: 'Sales' },
  { icon: Users, label: 'Customers' },
  { icon: FileText, label: 'Expenses' },
  { icon: BarChart3, label: 'Invoices' },
  { icon: Store, label: 'Dashboard' },
]

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
      className="w-full h-24"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
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
      <polygon fill="url(#chartGradient)" points={`0,100 ${points} 100,100`} />
    </svg>
  )
}

export default function HeroSection() {
  const { isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'

  return (
    <section id="hero" className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="grid gap-10 lg:gap-8 lg:grid-cols-2 items-center">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Shop Management Platform
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
              Manage Your Shop. <span className="text-primary">Sell Smarter.</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Dokantra helps you manage products, inventory, customers, sales, expenses, invoices,
              and business performance from one place.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="lg" asChild>
                <Link to="/register">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              {isAuthenticated && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              )}
              {!isAuthenticated && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              )}
            </div>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2.5 sm:gap-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <feature.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                  </span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div
              className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl blur-2xl"
              aria-hidden="true"
            />
            <Card className="relative border shadow-lg transition-shadow hover:shadow-xl">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <img src={logoSrc} alt="Dokantra" className="h-5 w-auto object-contain rounded-r-md" />
                  <span className="text-primary"></span> Dashboard Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MiniMetricCard title="Revenue" value="NPR 124,500" change="+12.5%" />
                  <MiniMetricCard title="Orders" value="48" />
                  <MiniMetricCard title="Expenses" value="NPR 32,100" />
                  <MiniMetricCard title="Profit" value="NPR 92,400" change="+8.2%" />
                </div>
                <Card className="border-dashed transition-colors hover:border-primary/30">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Sales Overview</p>
                    <DemoChart />
                  </CardContent>
                </Card>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Demo preview — illustrative UI</span>
                  <Badge variant="outline" className="text-[10px]">
                    Preview
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
