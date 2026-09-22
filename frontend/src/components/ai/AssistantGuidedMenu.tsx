import React from 'react'
import {
  ShoppingBag,
  Sprout,
  TrendingUp,
  Truck,
  Sparkles,
  LifeBuoy,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Search,
  CheckCircle2,
  CloudSun,
  Shield,
  FileText,
  DollarSign,
  Scale,
} from 'lucide-react'
import { useAssistant } from '../../contexts/useAssistant'

export const AssistantGuidedMenu: React.FC = () => {
  const {
    currentMenu,
    pushNav,
    popNav,
    resetNav,
    sendMessage,
    setActiveTab,
    userRole,
    currentPageName,
    suggestedPagePrompts,
  } = useAssistant()

  const handleAction = (prompt: string, nextTab: 'chat' | 'workflow' = 'chat') => {
    setActiveTab(nextTab)
    if (nextTab === 'chat') {
      sendMessage(prompt)
    }
  }

  // If in MAIN menu, render main categories
  if (currentMenu === 'MAIN') {
    const isFarmer = userRole === 'FARMER' || userRole === 'ADMIN'
    const isBuyer = userRole === 'BUYER' || userRole === 'BULK_BUYER' || userRole === 'CONSUMER' || userRole === 'ADMIN'

    return (
      <div className="p-4 space-y-4 text-slate-100 overflow-y-auto">
        {/* Contextual Suggestions for Current Page */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Contextual Help on {currentPageName}:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPagePrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleAction(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-500/30 text-emerald-200 text-left transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Guided Category Cards */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold tracking-wider uppercase text-emerald-400">
            Select an Assistant Category
          </h3>

          {/* BUYER HELP (if buyer/consumer/admin or guest) */}
          {isBuyer && (
            <button
              type="button"
              onClick={() => pushNav('BUYER_HELP')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Buyer & Sourcing Help
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Find produce, compare offers, request crops & track orders
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>
          )}

          {/* FARMER HELP (if farmer/admin or guest) */}
          {isFarmer && (
            <button
              type="button"
              onClick={() => pushNav('FARMER_HELP')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Farmer & Harvest Help
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    List produce, find buyers, predict prices & check weather
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* MARKET INTELLIGENCE */}
          <button
            type="button"
            onClick={() => pushNav('MARKET')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Market & Mandi Intelligence
                </h4>
                <p className="text-[11px] text-slate-400">
                  Current Mandi rates, price trends, demand & selling windows
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* LOGISTICS */}
          <button
            type="button"
            onClick={() => pushNav('LOGISTICS')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Logistics & Shipment Tracking
                </h4>
                <p className="text-[11px] text-slate-400">
                  Track transit checkpoints, delivery ETA & transport costs
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </button>

          {/* AI TOOLS */}
          <button
            type="button"
            onClick={() => pushNav('AI_TOOLS')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  AI Agronomy & ML Tools
                </h4>
                <p className="text-[11px] text-slate-400">
                  Price prediction, demand forecast, yield & crop advice
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </button>

          {/* SUPPORT */}
          <button
            type="button"
            onClick={() => pushNav('SUPPORT')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Escrow, Disputes & Support
                </h4>
                <p className="text-[11px] text-slate-400">
                  Verification help, payment inquiry, disputes & helpline
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </button>
        </div>
      </div>
    )
  }

  // Nested menu definitions
  const MENU_CONFIG: Record<
    string,
    { title: string; items: { label: string; prompt: string; isWizard?: boolean }[] }
  > = {
    BUYER_HELP: {
      title: 'Buyer & Sourcing Help',
      items: [
        { label: 'Find Available Produce', prompt: 'Search the marketplace for available crops and lots.' },
        { label: 'Search Marketplace', prompt: 'Take me to the marketplace to browse listings.' },
        { label: 'Compare Offers & Prices', prompt: 'Compare wheat and paddy price offers across Mandis.' },
        { label: 'Request Produce Lot', prompt: 'I want to submit a crop purchase demand.' },
        { label: 'Check Mandi Spot Price', prompt: 'What is today Mandi spot price for rice?' },
        { label: 'Track My Orders', prompt: 'Show my open orders and delivery status.' },
        { label: 'Find Verified Sellers', prompt: 'Show me verified Tier-1 farmers with high trust scores.' },
      ],
    },
    FARMER_HELP: {
      title: 'Farmer & Harvest Help',
      items: [
        { label: 'Guided Listing Wizard', prompt: 'Help me list produce', isWizard: true },
        { label: 'Find Matched Buyers', prompt: 'Find verified buyers matching my crop harvest.' },
        { label: 'Check Market Price', prompt: 'What is today market price for my crops?' },
        { label: 'Predict Next Week Price', prompt: 'Predict the crop price trend for next week.' },
        { label: 'Demand Forecast', prompt: 'Which crops will experience higher demand next month?' },
        { label: 'Hyper-local Weather Alert', prompt: 'Check today weather forecast and agricultural advisory.' },
        { label: 'My Trust Score & KYC', prompt: 'Explain my trust score breakdown and verification status.' },
      ],
    },
    MARKET: {
      title: 'Market & Mandi Intelligence',
      items: [
        { label: 'Current Market Price', prompt: 'Check today Mandi benchmark prices for Rice and Wheat.' },
        { label: 'Price Trends Trajectory', prompt: 'Show price trends and price stability for pulses and grain.' },
        { label: 'Nearby Mandis Comparison', prompt: 'Compare prices between nearby Mandis in Odisha.' },
        { label: 'Best Selling Window', prompt: 'When is the best selling window for my crop?' },
        { label: 'High Demand Commodities', prompt: 'Show high demand commodities across state markets.' },
      ],
    },
    LOGISTICS: {
      title: 'Logistics & Fleet Tracking',
      items: [
        { label: 'Track Active Shipment', prompt: 'Track my active shipment and show checkpoints.' },
        { label: 'Check Delivery ETA', prompt: 'What is the estimated delivery arrival time for my orders?' },
        { label: 'Calculate Transport Cost', prompt: 'Help me estimate transport and haulage cost per km.' },
        { label: 'Find Logistics Partners', prompt: 'Find verified cold-chain and dry freight logistics providers.' },
      ],
    },
    AI_TOOLS: {
      title: 'AI Agronomy & ML Tools',
      items: [
        { label: 'ML Price Prediction', prompt: 'Predict expected market price using the trained ML model.' },
        { label: 'Demand Forecasting Model', prompt: 'Run demand forecast for the upcoming agricultural cycle.' },
        { label: 'Crop Pest & Disease Cure', prompt: 'How do I identify and treat early blight on Tomatoes?' },
        { label: 'Livestock Care & Dairy', prompt: 'How to maximize milk yield in Gir cows naturally?' },
        { label: 'PM-KISAN Scheme Details', prompt: 'What are the eligibility criteria and portal link for PM-KISAN?' },
      ],
    },
    SUPPORT: {
      title: 'Escrow, Disputes & Support',
      items: [
        { label: 'Escrow Payment Protection', prompt: 'Explain how AgriDirect digital escrow protects my payment.' },
        { label: 'Report a Quality Dispute', prompt: 'How do I raise a quality check dispute for an order?' },
        { label: 'Farmer KYC Verification Help', prompt: 'How do I complete my Land & Aadhaar KYC verification?' },
        { label: 'Contact Toll-Free Helpline', prompt: 'What is the official AgriDirect toll-free customer helpline?' },
      ],
    },
  }

  const currentConfig = MENU_CONFIG[currentMenu] || MENU_CONFIG.BUYER_HELP

  return (
    <div className="p-4 space-y-4 text-slate-100 flex flex-col h-full justify-between">
      <div>
        {/* Navigation Stack Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
          <button
            type="button"
            onClick={popNav}
            className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={resetNav}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Back to menu</span>
          </button>
        </div>

        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>{currentConfig.title}</span>
        </h3>

        {/* Action Buttons */}
        <div className="space-y-2">
          {currentConfig.items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleAction(item.prompt, item.isWizard ? 'workflow' : 'chat')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/30 text-left text-xs text-slate-200 hover:text-emerald-200 group transition-all"
            >
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        Tip: You can also type freely or tap 🎙️ at any time to ask questions in your language.
      </div>
    </div>
  )
}
