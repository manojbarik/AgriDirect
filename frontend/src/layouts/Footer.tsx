import React from 'react'
import { Link } from 'react-router-dom'
import { Sprout, ShieldCheck, Cpu, HeartHandshake, Truck } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pt-16 pb-12 text-slate-600 dark:text-slate-400 text-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
                <Sprout className="w-5 h-5 text-amber-200" />
              </div>
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Agri<span className="text-emerald-600 dark:text-emerald-400">Direct</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              India's transparent farmer-to-buyer agricultural commerce ecosystem. AI price predictions, GPS order tracking, and zero-broker direct contracts.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Smart India Hackathon 2026</span>
            </div>
          </div>

          {/* Col 2: Marketplace & Produce */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Marketplace
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/marketplace" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Browse Fresh Produce
                </Link>
              </li>
              <li>
                <Link to="/prices" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Mandi Price Intelligence
                </Link>
              </li>
              <li>
                <Link to="/farmers" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Verified Farmer Directory
                </Link>
              </li>
              <li>
                <Link to="/contracts" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Direct Forward Contracts
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Technology */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Technology
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Cpu className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>LightGBM AI Mandi Forecasts</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Truck className="w-4 h-4 text-cyan-500 shrink-0" />
                <Link to="/logistics" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Live GPS Route Tracking
                </Link>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Multi-Sign Escrow Settlement</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <HeartHandshake className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Algorithmic Trust Scores</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Onboarding */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Get Started
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Join thousands of verified farmers and institutional buyers across India.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to="/register"
                  className="w-full text-center py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Create Free Account
                </Link>
                <Link
                  to="/login"
                  className="w-full text-center py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>&copy; {new Date().getFullYear()} AgriDirect Platform. Built for Indian Agriculture.</p>
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="hover:text-emerald-500 transition-colors">Marketplace</Link>
            <Link to="/prices" className="hover:text-emerald-500 transition-colors">Prices</Link>
            <Link to="/logistics" className="hover:text-emerald-500 transition-colors">Logistics</Link>
            <Link to="/health" className="hover:text-emerald-500 transition-colors">System Health</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
