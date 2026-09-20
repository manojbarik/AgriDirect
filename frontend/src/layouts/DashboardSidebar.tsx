import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Sprout, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useI18n } from '../i18n/I18nProvider'
import { isNavActive, type RoleNavigation, type NavItem } from '../api/navigation'
import { cn } from '../api/utils'
import { Avatar, Tooltip } from '../components/ui'

interface DashboardSidebarProps {
  navigation: RoleNavigation
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function DashboardSidebar({
  navigation,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navigation.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && isNavActive(item.to, location.pathname)) {
          initial[item.to] = true
        }
      })
    })
    return initial
  })

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleGroup = (to: string) => {
    setOpenGroups((prev) => ({ ...prev, [to]: !prev[to] }))
  }

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-col border-r transition-[width] duration-300 ease-out bg-white dark:bg-[#07120c] border-emerald-500/15 shadow-sm w-full',
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex items-center h-14 border-b border-emerald-500/15 transition-all',
            collapsed ? 'justify-center px-2' : 'gap-3 px-4',
          )}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-emerald-300/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sprout className="w-5 h-5 text-amber-200" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white font-display">
                    Agri<span className="text-emerald-500">Direct</span>
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400/80 tracking-wide uppercase truncate">
                  {navigation.brandLabel}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 scrollbar-thin">
          {navigation.sections.map((section, sectionIndex) => (
            <div key={`${navigation.role}-${section.label}-${sectionIndex}`}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-300/60">
                  {t(`navLabel.${section.label}`) || section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) =>
                  item.children ? (
                    <SidebarGroup
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      open={!!openGroups[item.to]}
                      onToggle={() => toggleGroup(item.to)}
                      currentPath={location.pathname}
                    />
                  ) : (
                    <SidebarLink
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      currentPath={location.pathname}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* User Account & Collapse Toggle */}
        <div className="p-3 border-t border-emerald-500/15 bg-slate-50/50 dark:bg-[#0c1611]/60 space-y-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-2xl p-2 bg-white dark:bg-[#111f18] border border-slate-200/80 dark:border-emerald-500/20 shadow-xs transition-all',
              collapsed && 'flex-col justify-center px-0 py-3',
            )}
          >
            <Avatar name={user?.email ?? user?.phone_e164 ?? 'Guest'} size="md" variant="default" />
            {!collapsed ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.email ?? user?.phone_e164 ?? 'Guest'}
                  </p>
                  <span className="inline-block text-[9px] font-bold px-1.5 py-px rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    {navigation.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={t('header.logout')}
                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t('header.logout')}
                className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Collapse view</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white dark:bg-[#07120c] border-r border-emerald-500/20 shadow-2xl">
            <div className="flex items-center justify-between h-12 px-4 border-b border-emerald-500/15">
              <Link to="/" onClick={onCloseMobile} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md border border-emerald-300/30">
                  <Sprout className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white font-display">
                    Agri<span className="text-emerald-500">Direct</span>
                  </span>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {navigation.brandLabel}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {navigation.sections.map((section, sectionIndex) => (
                <div key={`mob-${navigation.role}-${section.label}-${sectionIndex}`}>
                  <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-300/60">
                    {t(`navLabel.${section.label}`) || section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) =>
                      item.children ? (
                        <div key={`mob-grp-${item.to}`} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.to)}
                            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <item.icon className="w-4 h-4 text-slate-400 dark:text-emerald-400/70" />
                              <span>{t(`navLabel.${item.label}`) ?? item.label}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform duration-200 text-slate-400',
                                openGroups[item.to] && 'rotate-180',
                              )}
                            />
                          </button>
                          {openGroups[item.to] && (
                            <div className="pl-6 space-y-1 border-l-2 border-emerald-500/20 ml-4 my-1">
                              {item.children.map((child) => {
                                const active = isNavActive(child.to, location.pathname)
                                return (
                                  <Link
                                    key={`mob-sub-${child.to}`}
                                    to={child.to}
                                    onClick={onCloseMobile}
                                    className={cn(
                                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                                      active
                                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10',
                                    )}
                                  >
                                    <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{t(`navLabel.${child.label}`) ?? child.label}</span>
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          key={`mob-link-${item.to}`}
                          to={item.to}
                          onClick={onCloseMobile}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                            isNavActive(item.to, location.pathname)
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10',
                          )}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{t(`navLabel.${item.label}`) ?? item.label}</span>
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => {
                  if (onCloseMobile) onCloseMobile()
                  handleLogout()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SidebarLink({
  item,
  collapsed,
  currentPath,
}: {
  item: NavItem
  collapsed: boolean
  currentPath: string
}) {
  const { t } = useI18n()
  const active = isNavActive(item.to, currentPath)
  const label = t(`navLabel.${item.label}`) ?? item.label

  const linkContent = (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-150',
        collapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5',
        active
          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-950/20 font-bold'
          : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/10',
      )}
    >
      <item.icon
        className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform',
          active ? 'text-amber-200' : 'text-slate-400 dark:text-emerald-400/60',
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip key={item.to} side="right" content={label} delay={0}>
        {linkContent}
      </Tooltip>
    )
  }
  return linkContent
}

function SidebarGroup({
  item,
  collapsed,
  open,
  onToggle,
  currentPath,
}: {
  item: NavItem
  collapsed: boolean
  open: boolean
  onToggle: () => void
  currentPath: string
}) {
  const { t } = useI18n()
  const active = item.children?.some((c) => isNavActive(c.to, currentPath)) ?? false
  const label = t(`navLabel.${item.label}`) ?? item.label

  const button = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors',
        collapsed && 'justify-center px-2',
        active
          ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10'
          : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-300',
      )}
    >
      <item.icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-emerald-400/60',
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform text-slate-400', open && 'rotate-180')}
          />
        </>
      )}
    </button>
  )

  const groupButton = collapsed ? (
    <Tooltip side="right" content={label} delay={0}>
      {button}
    </Tooltip>
  ) : (
    button
  )

  return (
    <div>
      {groupButton}
      {open && !collapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-500/20 pl-2.5">
          {item.children!.map((child) => {
            const childActive = isNavActive(child.to, currentPath)
            const childLabel = t(child.label as never) ?? child.label
            return (
              <Link
                key={child.to}
                to={child.to}
                aria-current={childActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                  childActive
                    ? 'text-emerald-600 dark:text-emerald-300 font-bold bg-emerald-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    childActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-emerald-950/60',
                  )}
                />
                <span className="truncate">{childLabel}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
