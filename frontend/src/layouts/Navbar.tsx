import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { 
  Sprout, 
  Store, 
  LayoutDashboard, 
  Package, 
  Sparkles, 
  Layers, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert, 
  Activity,
  Bot,
  FileSignature,
  TrendingUp,
} from 'lucide-react'

interface NavbarProps {
  onOpenAiAssistant?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAiAssistant }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getDashboardLink = () => {
    if (!user) return '/login'
    if (user.role === 'FARMER') return '/farmer/dashboard'
    if (user.role === 'BUYER') return '/buyer/dashboard'
    return '/admin'
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#07120c]/85 backdrop-blur-xl border-b border-emerald-500/20 py-3 shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-[#07120c]/90 via-[#07120c]/40 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 border border-emerald-300/30 group-hover:scale-105 transition-transform">
            <Sprout className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-display">
                Agri<span className="text-emerald-400">Direct</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Direct Farming
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/60 font-medium tracking-wide hidden sm:block">
              Intelligent Farmer-Buyer Ecosystem
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <Link
            to="/marketplace"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              location.pathname === '/marketplace'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </Link>

          <Link
            to="/marketplace/livestock"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              location.pathname.startsWith('/marketplace/livestock')
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🐾</span>
            <span>Livestock</span>
          </Link>

          <Link
            to="/prices"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              location.pathname === '/prices'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Market Prices</span>
          </Link>

          {user && (
            <>
              <Link
                to={getDashboardLink()}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  location.pathname.includes('/dashboard')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              {user.role === 'FARMER' && (
                <>
                  <Link
                    to="/farmer/listings"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/farmer/listings'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Listings</span>
                  </Link>
                  <Link
                    to="/farmer/recommendations"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/farmer/recommendations'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Matches</span>
                  </Link>
                  <Link
                    to="/contracts"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname.startsWith('/contracts')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Contracts</span>
                  </Link>
                  <Link
                    to="/farmer/batches"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/farmer/batches'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Batches</span>
                  </Link>
                </>
              )}

              {user.role === 'BUYER' && (
                <>
                  <Link
                    to="/buyer/demands"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/buyer/demands'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Demands</span>
                  </Link>
                  <Link
                    to="/buyer/recommendations"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/buyer/recommendations'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Recommendations</span>
                  </Link>
                  <Link
                    to="/contracts"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname.startsWith('/contracts')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Contracts</span>
                  </Link>
                </>
              )}

              {user.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/disputes"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/admin/disputes'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Disputes</span>
                  </Link>
                  <Link
                    to="/admin/verifications"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      location.pathname === '/admin/verifications'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Verifications</span>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Right Action Icons & Auth */}
        <div className="flex items-center gap-2.5">
          {/* AI Assistant Button */}
          {onOpenAiAssistant && (
            <button
              onClick={onOpenAiAssistant}
              className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 hover:text-white transition-all shadow-md shadow-emerald-950/30 flex items-center gap-1.5 px-3"
              title="Open AgriDirect AI Assistant"
            >
              <Bot className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold hidden lg:inline">AgriDirect AI</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </Link>

              <Link
                to="/account"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors"
                title="My Account"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline max-w-[100px] truncate">{user.phone_e164}</span>
                <span className="px-1.5 py-px rounded text-[10px] bg-emerald-500/20 text-emerald-300 uppercase font-bold">
                  {user.role}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:brightness-110 shadow-lg shadow-amber-950/40 border border-amber-300/40 transition-all hover:scale-105"
              >
                Join AgriDirect
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 bg-[#07120c]/95 backdrop-blur-2xl border-b border-emerald-500/20 shadow-2xl space-y-2">
          <Link
            to="/marketplace"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Marketplace</span>
          </Link>

          <Link
            to="/marketplace/livestock"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <span>🐾</span>
            <span>Livestock Market</span>
          </Link>

          <Link
            to="/prices"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Market Prices</span>
          </Link>

          {user && (
            <>
              <Link
                to={getDashboardLink()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span>Dashboard ({user.role})</span>
              </Link>

              {user.role === 'FARMER' && (
                <>
                  <Link
                    to="/farmer/listings"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>My Listings</span>
                  </Link>
                  <Link
                    to="/farmer/recommendations"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Matches</span>
                  </Link>
                  <Link
                    to="/contracts"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <FileSignature className="w-4 h-4 text-emerald-400" />
                    <span>Contracts</span>
                  </Link>
                  <Link
                    to="/farmer/batches"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Batches</span>
                  </Link>
                  <Link
                    to="/farmer/orders"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Orders</span>
                  </Link>
                </>
              )}

              {user.role === 'BUYER' && (
                <>
                  <Link
                    to="/buyer/demands"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>My Demands</span>
                  </Link>
                  <Link
                    to="/buyer/recommendations"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Recommendations</span>
                  </Link>
                  <Link
                    to="/contracts"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <FileSignature className="w-4 h-4 text-emerald-400" />
                    <span>Contracts</span>
                  </Link>
                  <Link
                    to="/buyer/orders"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Orders</span>
                  </Link>
                </>
              )}

              <Link
                to="/account"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>Account Profile</span>
              </Link>
              <Link
                to="/notifications"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Notifications</span>
              </Link>
            </>
          )}

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <Link to="/health" className="text-xs text-emerald-300/70 hover:text-emerald-300">
              API Status
            </Link>
            {user && (
              <button
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
