import { Link, useLocation } from 'react-router-dom'
import { isNavActive, type RoleNavigation } from '../api/navigation'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../api/utils'

interface DashboardBottomNavProps {
  navigation: RoleNavigation
}

export function DashboardBottomNav({ navigation }: DashboardBottomNavProps) {
  const { t } = useI18n()
  const location = useLocation()
  const mobile = navigation.mobile.slice(0, 5)
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg font-sans"
    >
      <div className="grid divide-x divide-slate-100 dark:divide-slate-800" style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}>
        {mobile.map((item) => {
          const active = isNavActive(item.to, location.pathname)
          const label = t(`navLabel.${item.label}`) || item.label
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <item.icon className={cn('w-4 h-4', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')} />
              <span className="truncate max-w-[64px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}