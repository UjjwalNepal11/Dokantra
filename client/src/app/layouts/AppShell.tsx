import { Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import AppShellComponent from '../../components/layout/AppShell'

interface AppShellProps {
  children?: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return <AppShellComponent>{children ?? <Outlet />}</AppShellComponent>
}
