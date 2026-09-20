import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { navigationForRole } from '../api/navigation'
import { useRoleTheme, roleThemeClassName } from '../hooks/useRoleTheme'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardHeader } from './DashboardHeader'
import { DashboardBottomNav } from './DashboardBottomNav'
import { cn } from '../api/utils'

interface DashboardLayoutProps {
  role?: 'FARMER' | 'BUYER' | 'CONSUMER' | 'LOGISTICS' | 'ADMIN' | 'BULK_BUYER'
}

const SIDEBAR_WIDTH_KEY = 'agridirect:sidebar:collapsed'

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user } = useAuth()
  const navigation = navigationForRole(role ?? user?.role)
  const { roleTheme } = useRoleTheme()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_WIDTH_KEY) === '1'
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div
      className={roleThemeClassName(roleTheme)}
      style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main, var(--bg-surface))' }}
    >
      <div
        className={cn(
          'lg:grid lg:grid-cols-[var(--sidebar-w,18rem)_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out',
        )}
        style={{ ['--sidebar-w' as string]: collapsed ? '4.5rem' : '16.25rem' }}
      >
        <DashboardSidebar
          navigation={navigation}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
        />
        <div className="flex min-h-screen min-w-0 flex-col">
          <DashboardHeader
            role={role ?? user?.role}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          />
          <main className="flex-1 min-w-0" style={{ backgroundColor: 'var(--bg-main, var(--bg-surface))' }}>
            <Outlet />
          </main>
        </div>
      </div>
      <DashboardBottomNav navigation={navigation} />
    </div>
  )
}
