import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Receipt,
  FolderOpen,
  Settings,
  Bell,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  section?: 'primary' | 'secondary'
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'primary' },
  { label: 'Sales', path: '/sales', icon: ShoppingCart, section: 'primary' },
  { label: 'Products', path: '/products', icon: Package, section: 'primary' },
  { label: 'Inventory', path: '/inventory', icon: Warehouse, section: 'primary' },
  { label: 'Customers', path: '/customers', icon: Users, section: 'primary' },
  { label: 'Expenses', path: '/expenses', icon: Receipt, section: 'primary' },
  { label: 'Categories', path: '/categories', icon: FolderOpen, section: 'primary' },
  { label: 'Notifications', path: '/notifications', icon: Bell, section: 'secondary' },
  { label: 'Settings', path: '/settings', icon: Settings, section: 'secondary' },
]
