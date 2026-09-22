import { Link, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useRoleTheme } from '../hooks/useRoleTheme'
import AccountPage from '../pages/AccountPage'
import LoginPage from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import RegisterPage from '../pages/RegisterPage'
import VerifyPage from '../pages/VerifyPage'
import PriceIntelligencePage from '../pages/PriceIntelligencePage'
import { DashboardLayout } from '../layouts/DashboardLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import FarmerRoute from '../components/FarmerRoute'
import AdminRoute from '../components/AdminRoute'
import AdminDisputesPage from '../pages/admin/AdminDisputesPage'
import AdminTrustScoresPage from '../pages/admin/AdminTrustScoresPage'
import LegacyAdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminBrowsePage from '../pages/admin/AdminBrowsePage'
import AdminVerificationsPage from '../pages/admin/AdminVerificationsPage'
import LegacyNotificationsPage from '../pages/notifications/NotificationsPage'
import LegacyFarmerDashboardPage from '../pages/farmer/FarmerDashboardPage'
import { AIAssistantPage } from '../pages/AIAssistantPage'
import { FarmersDirectoryPage } from '../pages/FarmersDirectoryPage'
import { AddHarvestPage } from '../pages/AddHarvestPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { OrderNowPage } from '../pages/OrderNowPage'
import FarmerListingsPage from '../pages/farmer/FarmerListingsPage'
import FarmerOnboardingPage from '../pages/farmer/FarmerOnboardingPage'
import FarmerRecommendationsPage from '../pages/farmer/FarmerRecommendationsPage'
import FarmerBatchesPage from '../pages/batches/FarmerBatchesPage'
import BuyerRoute from '../components/BuyerRoute'
import ConsumerRoute from '../components/ConsumerRoute'
import BuyerDashboardPage from '../pages/buyer/BuyerDashboardPage'
import BuyerDemandsPage from '../pages/buyer/BuyerDemandsPage'
import BuyerRecommendationsPage from '../pages/buyer/BuyerRecommendationsPage'
import BuyerOnboardingPage from '../pages/buyer/BuyerOnboardingPage'
import BulkBuyerDashboardPage from '../pages/bulk-buyer/BulkBuyerDashboardPage'
import LegacyOrdersPage from '../pages/orders/OrdersPage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'
import { OrdersPage as PremiumOrdersPage } from '../pages/OrdersPage'
import LegacyMarketplacePage from '../pages/marketplace/MarketplacePage'
import LivestockMarketplacePage from '../pages/marketplace/LivestockMarketplacePage'
import FarmerLivestockPage from '../pages/farmer/FarmerLivestockPage'
import LegacyListingDetailPage from '../pages/marketplace/ListingDetailPage'
import FarmerProfilePage from '../pages/marketplace/FarmerProfilePage'
import ContractsPage from '../pages/contracts/ContractsPage'
import ContractNewPage from '../pages/contracts/ContractNewPage'
import ContractDetailPage from '../pages/contracts/ContractDetailPage'
import { CartProvider } from '../contexts/CartContext'
import FarmerWeatherPage from '../pages/farmer/FarmerWeatherPage'
import FarmerStoragePage from '../pages/farmer/FarmerStoragePage'
import FarmerNotesPage from '../pages/farmer/FarmerNotesPage'
import FarmerProductsPage from '../pages/farmer/FarmerProductsPage'
import FarmerProductDetailPage from '../pages/farmer/FarmerProductDetailPage'
import FarmerInventoryPage from '../pages/farmer/FarmerInventoryPage'
import FarmerFarmPage from '../pages/farmer/FarmerFarmPage'
import FarmerAccountOverviewPage from '../pages/farmer/FarmerAccountOverviewPage'
import { I18nProvider } from '../i18n/I18nProvider'
import ConsumerHomePage from '../pages/consumer/ConsumerHomePage'
import ConsumerMarketplacePage from '../pages/consumer/ConsumerMarketplacePage'
import ConsumerCartPage from '../pages/consumer/ConsumerCartPage'
import ConsumerCommunityPage from '../pages/consumer/ConsumerCommunityPage'
import ConsumerWeatherPage from '../pages/consumer/ConsumerWeatherPage'
import ConsumerProfilePage from '../pages/consumer/ConsumerProfilePage'
import LogisticsDashboardPage from '../pages/logistics/LogisticsDashboardPage'
import TripDetailPage from '../pages/logistics/TripDetailPage'

import { AIPriceEngine } from '../components/home/AIPriceEngine'
import { EscrowSection } from '../components/home/EscrowSection'
import { TrustSection } from '../components/home/TrustSection'
import { ContractSection } from '../components/home/ContractSection'
import { AgricultureEnvironment } from '../components/scene/AgricultureEnvironment'
import { AssistantProvider } from '../contexts/AssistantContext'
import { useAssistant } from '../contexts/useAssistant'
import { GlobalAssistantWidget } from '../components/ai/GlobalAssistantWidget'
import { Footer } from '../layouts/Footer'
import { Sprout, Bot } from 'lucide-react'
import { getRealWorldTimeOfDay } from '../utils/timeOfDay'

function dashboardPath(role: string): string {
  switch (role) {
    case 'FARMER':
      return '/farmer/dashboard'
    case 'BUYER':
      return '/buyer/dashboard'
    case 'BULK_BUYER':
      return '/bulk-buyer/dashboard'
    case 'CONSUMER':
      return '/consumer/dashboard'
    case 'LOGISTICS':
      return '/logistics'
    case 'ADMIN':
    default:
      return '/admin'
  }
}

function HomePage() {
  const [timeMode, setTimeMode] = useState<'auto' | 'golden' | 'day' | 'twilight' | 'night'>('auto')
  const [currentTime, setCurrentTime] = useState<'golden' | 'day' | 'twilight' | 'night'>(getRealWorldTimeOfDay())
  const { openAssistant } = useAssistant()
  const { user } = useAuth()

  // Real-world clock sync
  useEffect(() => {
    const updateTime = () => {
      const real = getRealWorldTimeOfDay()
      setCurrentTime(real)
    }
    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  const activeTimeOfDay = timeMode === 'auto' ? currentTime : timeMode

  return (
    <>
      <AgricultureEnvironment variant="hero" timeOfDay={activeTimeOfDay} showFarmer={true}>
        {/* Top Navbar matching showcase */}
        <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between z-30 font-sans">
          {/* Brand Logo & Tag */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-black/40 group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">
                  Agri<span className="text-emerald-400">Direct</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                  DIRECT AGRICULTURE
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70 font-medium">
                Direct Farmer-to-Buyer Ecosystem
              </p>
            </div>
          </Link>

          {/* Inline Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
            <Link to="/marketplace" className="hover:text-emerald-400 transition-colors">
              Marketplace
            </Link>
            <Link to="/prices" className="hover:text-emerald-400 transition-colors">
              Market Prices
            </Link>
            <a href="#dashboards" className="hover:text-emerald-400 transition-colors">
              Platform Dashboards
            </a>
          </nav>

          {/* Right Header Controls: Dawn/Day/Twilight + AgriDirect AI + Sign In */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Dynamic Time Mode Selector Pill */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl p-1 rounded-full border border-white/15 text-xs text-neutral-200 shadow-xl">
              <button
                onClick={() => setTimeMode('day')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeTimeOfDay === 'day'
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-md'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Radiant Day Sun"
              >
                ☀️ Day
              </button>
              <button
                onClick={() => setTimeMode('golden')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeTimeOfDay === 'golden'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Dawn Sunrise"
              >
                🌾 Dawn
              </button>
              <button
                onClick={() => setTimeMode('night')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeTimeOfDay === 'night'
                    ? 'bg-indigo-500 text-white font-bold shadow-md'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Starlit Night & Moon"
              >
                🌙 Night
              </button>
              <button
                onClick={() => setTimeMode('twilight')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeTimeOfDay === 'twilight'
                    ? 'bg-rose-600 text-white font-bold shadow-md'
                    : 'hover:text-white text-neutral-400'
                }`}
                title="Sunset Twilight"
              >
                🌅 Sunset
              </button>
            </div>

            {/* AgriDirect AI Button */}
            <button
              onClick={() => openAssistant()}
              className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Open AgriDirect AI Assistant"
            >
              <Bot className="w-4 h-4 text-amber-300" />
              <span>AgriDirect AI</span>
            </button>

            {/* Sign in / Dashboard Button */}
            {user ? (
              <Link
                to={dashboardPath(user.role)}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all"
              >
                {user.role} Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-black/60 hover:bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white border border-white/15 transition-all"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Hero Board Section - Centered in middle */}
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 md:py-24 relative z-20 font-sans flex items-center justify-center">
          {/* Centered Hero Board */}
          <div className="w-full max-w-2xl mx-auto rounded-[32px] bg-[#111e16]/90 backdrop-blur-2xl p-7 sm:p-9 md:p-10 border border-white/20 shadow-2xl space-y-6">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <span>🌾</span> SMART AGRICULTURE • FUTURE FARMING
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Network Live
              </span>
            </div>

            {/* Giant Title with colorful accents */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black leading-[1.08] tracking-tight text-white drop-shadow-md">
              Grow Smarter.{' '}
              <span className="text-[#facc15]">Sell</span>
              <br />
              <span className="text-[#34d399]">Direct.</span> Farm the
              <br />
              Future.
            </h1>

            {/* Narrative Subtitle */}
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-normal max-w-lg">
              AgriDirect connects farmers, markets, technology and intelligent insights in one agricultural ecosystem.
            </p>

            {/* 3 Primary Action Buttons */}
            <nav className="pt-2 flex flex-wrap items-center gap-3" aria-label="Hero Actions">
              <Link
                to="/marketplace"
                className="rounded-full bg-[#10b981] hover:bg-[#059669] px-6 py-3 text-sm font-bold text-[#06281f] shadow-lg shadow-emerald-950/60 hover:brightness-110 transition-all hover:scale-[1.02]"
              >
                Explore Marketplace
              </Link>

              <Link
                to="/register"
                className="rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:brightness-110 px-6 py-3 text-sm font-black text-[#06281f] shadow-lg shadow-amber-950/40 transition-all hover:scale-[1.02]"
              >
                Join AgriDirect
              </Link>

              <button
                onClick={() => openAssistant()}
                className="rounded-full bg-black/60 hover:bg-black/80 px-5 py-3 text-sm font-semibold text-amber-300 hover:text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-amber-300" />
                <span>Ask AI Engine</span>
              </button>
            </nav>

            {/* Bottom 4 Feature Cards inside the Board - Spacious, Distinct & Elevated */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4.5 text-left">
              <a
                href="#dashboard-price"
                className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/40 shadow-lg transition-all block hover:scale-[1.03]"
              >
                <span className="text-2xl sm:text-3xl block mb-2">📈</span>
                <p className="text-sm font-bold text-white">AI Price Engine</p>
                <p className="text-xs text-slate-300 mt-1 leading-normal">Real-time Mandi trends</p>
              </a>

              <a
                href="#dashboard-contracts"
                className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/40 shadow-lg transition-all block hover:scale-[1.03]"
              >
                <span className="text-2xl sm:text-3xl block mb-2">🤝</span>
                <p className="text-sm font-bold text-white">Direct Contracts</p>
                <p className="text-xs text-slate-300 mt-1 leading-normal">0% broker deductions</p>
              </a>

              <a
                href="#dashboard-escrow"
                className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/40 shadow-lg transition-all block hover:scale-[1.03]"
              >
                <span className="text-2xl sm:text-3xl block mb-2">🛡️</span>
                <p className="text-sm font-bold text-white">Escrow Secured</p>
                <p className="text-xs text-slate-300 mt-1 leading-normal">Protected payouts</p>
              </a>

              <a
                href="#dashboard-trust"
                className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/40 shadow-lg transition-all block hover:scale-[1.03]"
              >
                <span className="text-2xl sm:text-3xl block mb-2">⭐</span>
                <p className="text-sm font-bold text-white">Trust Scores</p>
                <p className="text-xs text-slate-300 mt-1 leading-normal">Verified farmer track</p>
              </a>
            </div>
          </div>
        </main>

      </AgricultureEnvironment>

      {/* Enterprise AgriDirect Dashboard Suite with Generous Spacing */}
      <section id="dashboards" className="relative z-20 bg-slate-50 dark:bg-[#050d09] border-t border-slate-200 dark:border-emerald-500/20 py-24 sm:py-32 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Main Dashboards Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-20 sm:mb-24 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              AgriDirect Ecosystem Dashboards
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Four Core Platforms. Zero Commission.
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore our four independent operational dashboards designed for real-time mandi intelligence, multi-signature milestone escrow, verified farmer reputation, and forward digital agreements.
            </p>

            {/* Quick-Jump Dashboard Nav Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
              <a
                href="#dashboard-price"
                className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>📈</span> Dashboard 01: AI Price Engine
              </a>
              <a
                href="#dashboard-escrow"
                className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>🛡️</span> Dashboard 02: Escrow Settlement
              </a>
              <a
                href="#dashboard-trust"
                className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>⭐</span> Dashboard 03: Verified Trust Scores
              </a>
              <a
                href="#dashboard-contracts"
                className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>🤝</span> Dashboard 04: Forward Contracts
              </a>
            </div>
          </div>

          {/* Dashboards Suite with Dedicated Container Separations */}
          <div className="flex flex-col">
            
            {/* ========================================================================= */}
            {/* DASHBOARD 01: AI PREDICTIVE INTELLIGENCE */}
            {/* ========================================================================= */}
            <div id="dashboard-price" className="scroll-mt-24 mb-20 sm:mb-28" style={{ marginBottom: '6rem' }}>
              {/* Prominent Dashboard Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-lg mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm sm:text-base tracking-widest font-mono">
                    DASHBOARD 01
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Mandi Price Intelligence & AI Forecasting
                  </h3>
                </div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs font-bold text-emerald-300 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Mandi Sync Active
                </span>
              </div>
              <AIPriceEngine />
            </div>

            {/* Visual Section Divider */}
            <div className="my-10 sm:my-14 flex items-center justify-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
              <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-cyan-500/40 text-xs font-bold text-cyan-400 uppercase tracking-widest shadow-md">
                NEXT: SECURITY & SETTLEMENT ENGINE
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            </div>

            {/* ========================================================================= */}
            {/* DASHBOARD 02: ESCROW VAULT */}
            {/* ========================================================================= */}
            <div id="dashboard-escrow" className="scroll-mt-24 mb-20 sm:mb-28" style={{ marginBottom: '6rem' }}>
              {/* Prominent Dashboard Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-cyan-500/40 shadow-lg mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-sm sm:text-base tracking-widest font-mono">
                    DASHBOARD 02
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Automated Milestone Escrow Settlement Vault
                  </h3>
                </div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-xs font-bold text-cyan-300 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Multi-Sig Protection Enabled
                </span>
              </div>
              <EscrowSection />
            </div>

            {/* Visual Section Divider */}
            <div className="my-10 sm:my-14 flex items-center justify-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/40 text-xs font-bold text-amber-400 uppercase tracking-widest shadow-md">
                NEXT: VERIFIED GROWER REPUTATION MATRIX
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            </div>

            {/* ========================================================================= */}
            {/* DASHBOARD 03: REPUTATION & TRUST */}
            {/* ========================================================================= */}
            <div id="dashboard-trust" className="scroll-mt-24 mb-20 sm:mb-28" style={{ marginBottom: '6rem' }}>
              {/* Prominent Dashboard Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/40 shadow-lg mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm sm:text-base tracking-widest font-mono">
                    DASHBOARD 03
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Farmer Reputation Engine & Trust Index
                  </h3>
                </div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-xs font-bold text-amber-300 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Audited Performance Track
                </span>
              </div>
              <TrustSection />
            </div>

            {/* Visual Section Divider */}
            <div className="my-10 sm:my-14 flex items-center justify-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-400 uppercase tracking-widest shadow-md">
                NEXT: DIRECT FORWARD CONTRACTS
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </div>

            {/* ========================================================================= */}
            {/* DASHBOARD 04: DIGITAL FORWARD CONTRACTS */}
            {/* ========================================================================= */}
            <div id="dashboard-contracts" className="scroll-mt-24 mb-10" style={{ marginBottom: '4rem' }}>
              {/* Prominent Dashboard Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-lg mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm sm:text-base tracking-widest font-mono">
                    DASHBOARD 04
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Direct Digital Forward Contract Binding
                  </h3>
                </div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs font-bold text-emerald-300 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Zero Broker Deduction
                </span>
              </div>
              <ContractSection />
            </div>

          </div>
        </div>
      </section>

      {/* Full-width Production-grade Footer */}
      <Footer />
    </>
  )
}

function HealthPage() {
  return (
    <AgricultureEnvironment variant="minimal" showFarmer={false}>
      <main className="page-shell flex flex-col items-center justify-center min-h-[80vh] text-center">
        <p className="eyebrow">Foundation System Check</p>
        <h1 className="page-title">AgriDirect API Health</h1>
        <p className="intro">The FastAPI service exposes its versioned health endpoint at:</p>
        <code className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-sm mb-6">
          GET /api/v1/health
        </code>
        <Link className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all" to="/">
          ← Back to AgriDirect Home
        </Link>
      </main>
    </AgricultureEnvironment>
  )
}

function NotFoundPage() {
  return (
    <AgricultureEnvironment variant="minimal" showFarmer={false}>
      <main className="page-shell flex flex-col items-center justify-center min-h-[80vh] text-center">
        <p className="eyebrow">404 Error</p>
        <h1 className="page-title">Page Not Found</h1>
        <p className="intro">The requested agricultural route does not exist.</p>
        <Link className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all" to="/">
          ← Return to AgriDirect Home
        </Link>
      </main>
    </AgricultureEnvironment>
  )
}

function ThemeApplier() {
  useRoleTheme()
  return null
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeApplier />
      <CartProvider>
        <AssistantProvider>
          <GlobalAssistantWidget />
          <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home-legacy" element={<HomePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/marketplace" element={<LegacyMarketplacePage />} />
        <Route path="/marketplace-legacy" element={<LegacyMarketplacePage />} />
        <Route path="/marketplace/livestock" element={<LivestockMarketplacePage />} />
        <Route path="/marketplace/listings/:id" element={<LegacyListingDetailPage />} />
        <Route path="/marketplace-legacy/listings/:id" element={<LegacyListingDetailPage />} />
        <Route path="/marketplace/farmers/:farmerId" element={<FarmerProfilePage />} />
        <Route path="/prices" element={<PriceIntelligencePage />} />

        <Route element={<DashboardLayout role="ADMIN" />}>
          <Route path="/admin" element={<AdminRoute><LegacyAdminDashboardPage /></AdminRoute>} />
          <Route path="/admin-legacy" element={<AdminRoute><LegacyAdminDashboardPage /></AdminRoute>} />
          <Route path="/admin/verifications" element={<AdminRoute><AdminVerificationsPage /></AdminRoute>} />
          <Route path="/admin/disputes" element={<AdminRoute><AdminDisputesPage /></AdminRoute>} />
          <Route path="/admin/trust-scores" element={<AdminRoute><AdminTrustScoresPage /></AdminRoute>} />
          <Route path="/admin/:section" element={<AdminRoute><AdminBrowsePage /></AdminRoute>} />
        </Route>

        <Route path="/assistant" element={<AIAssistantPage />} />
        <Route path="/farmers" element={<FarmersDirectoryPage />} />
        <Route path="/orders" element={<PremiumOrdersPage />} />
        <Route path="/orders/new" element={<OrderNowPage />} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        <Route element={<DashboardLayout role="FARMER" />}>
          <Route path="/farmer/dashboard" element={<FarmerRoute><LegacyFarmerDashboardPage /></FarmerRoute>} />
          <Route path="/farmer-dashboard-legacy" element={<FarmerRoute><LegacyFarmerDashboardPage /></FarmerRoute>} />
          <Route path="/farmer/account" element={<FarmerRoute><FarmerAccountOverviewPage /></FarmerRoute>} />
          <Route path="/farmer/assistant" element={<FarmerRoute><AIAssistantPage /></FarmerRoute>} />
          <Route path="/farmer/harvests/new" element={<FarmerRoute><AddHarvestPage /></FarmerRoute>} />
          <Route path="/farmer/onboarding" element={<FarmerRoute><FarmerOnboardingPage /></FarmerRoute>} />
          <Route path="/farmer/farm" element={<FarmerRoute><FarmerFarmPage /></FarmerRoute>} />
          <Route path="/farmer/listings" element={<FarmerRoute><FarmerListingsPage /></FarmerRoute>} />
          <Route path="/farmer/livestock" element={<FarmerRoute><FarmerLivestockPage /></FarmerRoute>} />
          <Route path="/farmer/recommendations" element={<FarmerRoute><FarmerRecommendationsPage /></FarmerRoute>} />
          <Route path="/farmer/orders" element={<FarmerRoute><LegacyOrdersPage /></FarmerRoute>} />
          <Route path="/farmer/orders/:id" element={<FarmerRoute><OrderDetailPage /></FarmerRoute>} />
          <Route path="/farmer/batches" element={<FarmerRoute><FarmerBatchesPage /></FarmerRoute>} />
          <Route path="/farmer/weather" element={<FarmerRoute><FarmerWeatherPage /></FarmerRoute>} />
          <Route path="/farmer/storage" element={<FarmerRoute><FarmerStoragePage /></FarmerRoute>} />
          <Route path="/farmer/notes" element={<FarmerRoute><FarmerNotesPage /></FarmerRoute>} />
          <Route path="/farmer/products" element={<FarmerRoute><FarmerProductsPage /></FarmerRoute>} />
          <Route path="/farmer/products/:id" element={<FarmerRoute><FarmerProductDetailPage /></FarmerRoute>} />
          <Route path="/farmer/inventory" element={<FarmerRoute><FarmerInventoryPage /></FarmerRoute>} />
        </Route>

        <Route element={<DashboardLayout role="BUYER" />}>
          <Route path="/buyer/onboarding" element={<BuyerRoute><BuyerOnboardingPage /></BuyerRoute>} />
          <Route path="/buyer/dashboard" element={<BuyerRoute><BuyerDashboardPage /></BuyerRoute>} />
          <Route path="/buyer/demands" element={<BuyerRoute><BuyerDemandsPage /></BuyerRoute>} />
          <Route path="/buyer/recommendations" element={<BuyerRoute><BuyerRecommendationsPage /></BuyerRoute>} />
          <Route path="/buyer/orders" element={<BuyerRoute><LegacyOrdersPage /></BuyerRoute>} />
          <Route path="/buyer/orders/:id" element={<BuyerRoute><OrderDetailPage /></BuyerRoute>} />
        </Route>

        <Route element={<DashboardLayout role="BULK_BUYER" />}>
          <Route path="/bulk-buyer/dashboard" element={<BuyerRoute><BulkBuyerDashboardPage /></BuyerRoute>} />
          <Route path="/bulk-buyer/onboarding" element={<BuyerRoute><BuyerOnboardingPage /></BuyerRoute>} />
          <Route path="/bulk-buyer/demands" element={<BuyerRoute><BuyerDemandsPage /></BuyerRoute>} />
          <Route path="/bulk-buyer/recommendations" element={<BuyerRoute><BuyerRecommendationsPage /></BuyerRoute>} />
          <Route path="/bulk-buyer/orders" element={<BuyerRoute><LegacyOrdersPage /></BuyerRoute>} />
          <Route path="/bulk-buyer/orders/:id" element={<BuyerRoute><OrderDetailPage /></BuyerRoute>} />
        </Route>

        <Route element={<DashboardLayout role="CONSUMER" />}>
          <Route path="/consumer" element={<ConsumerRoute><ConsumerHomePage /></ConsumerRoute>} />
          <Route path="/consumer/dashboard" element={<ConsumerRoute><ConsumerHomePage /></ConsumerRoute>} />
          <Route path="/consumer/marketplace" element={<ConsumerRoute><ConsumerMarketplacePage /></ConsumerRoute>} />
          <Route path="/consumer/cart" element={<ConsumerRoute><ConsumerCartPage /></ConsumerRoute>} />
          <Route path="/consumer/orders" element={<ConsumerRoute><PremiumOrdersPage /></ConsumerRoute>} />
          <Route path="/consumer/orders/:id" element={<ConsumerRoute><OrderDetailPage /></ConsumerRoute>} />
          <Route path="/consumer/community" element={<ConsumerRoute><ConsumerCommunityPage /></ConsumerRoute>} />
          <Route path="/consumer/weather" element={<ConsumerRoute><ConsumerWeatherPage /></ConsumerRoute>} />
          <Route path="/consumer/profile" element={<ConsumerRoute><ConsumerProfilePage /></ConsumerRoute>} />
        </Route>

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/logistics" element={<LogisticsDashboardPage />} />
          <Route path="/logistics/dashboard" element={<LogisticsDashboardPage />} />
          <Route path="/logistics/trips/:shipmentId" element={<TripDetailPage />} />
          <Route path="/logistics/track/:shipmentId" element={<LogisticsDashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/notifications-legacy" element={<LegacyNotificationsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/new" element={<ContractNewPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        </AssistantProvider>
      </CartProvider>
    </I18nProvider>
  )
}