import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Globe,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
} from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n, type Language } from '../i18n/I18nProvider'
import { navigationForRole, crumbTrail } from '../api/navigation'
import { getUnreadNotificationCount } from '../api/notifications'
import { Avatar } from '../components/ui'

interface DashboardHeaderProps {
  role?: 'FARMER' | 'BUYER' | 'CONSUMER' | 'LOGISTICS' | 'ADMIN' | 'BULK_BUYER'
  onOpenMobileDrawer?: () => void
}

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
]

export function DashboardHeader({ role, onOpenMobileDrawer }: DashboardHeaderProps) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { language, setLanguage } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const navigation = navigationForRole(role ?? user?.role)
  const [unread, setUnread] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [query, setQuery] = useState('')

  const homePath = navigation.mobile[0]?.to ?? navigation.sections[0]?.items[0]?.to ?? '/'
  const crumbs = crumbTrail(navigation, location.pathname)

  useEffect(() => {
    let cancelled = false
    getUnreadNotificationCount()
      .then(({ data }) => {
        if (!cancelled) setUnread(data.unread_count ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const profileName = user?.email ?? user?.phone_e164 ?? 'User'

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setProfileOpen(false)
    navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`)
  }

  const handleLogout = () => {
    setProfileOpen(false)
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 h-12 bg-white/80 dark:bg-[#07120c]/85 backdrop-blur-xl border-b border-emerald-500/15 shadow-xs transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Clean Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-xs">
          <Link
            to={homePath}
            aria-label="Dashboard home"
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex-shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            const isIntermediate = !isLast && index > 0
            return (
              <span
                key={`${crumb.label}-${index}`}
                className={`${isIntermediate ? 'hidden sm:flex' : 'flex'} items-center gap-1.5 min-w-0`}
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-emerald-500/40 flex-shrink-0" />
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 font-medium truncate transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className="text-slate-900 dark:text-white font-bold truncate max-w-[140px] sm:max-w-none"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      </div>

      {/* Center Search Pill (Desktop) */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-xs mx-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-emerald-400/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search crops, orders, mandi..."
            className="w-full pl-9 pr-4 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Language Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setLangOpen((v) => !v)
              setProfileOpen(false)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 transition-all"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="uppercase">{language}</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.code)
                    setLangOpen(false)
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between transition-colors ${
                    language === opt.code
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.native}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-full text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </Link>

        {/* User Profile Menu */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v)
              setLangOpen(false)
            }}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/30 transition-all"
          >
            <Avatar name={profileName} size="sm" variant="default" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-emerald-500/15">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {profileName}
                </p>
                <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  {navigation.role}
                </span>
              </div>
              <div className="py-1">
                <Link
                  to="/account"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile & Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
