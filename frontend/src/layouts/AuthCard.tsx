import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { AgricultureEnvironment } from '../components/scene/AgricultureEnvironment'
import { getRealWorldTimeOfDay } from '../utils/timeOfDay'
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher'

interface AuthCardProps {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  maxWidth?: 'md' | 'xl'
}

export function AuthCard({ title, subtitle, children, maxWidth = 'md' }: AuthCardProps) {
  return (
    <AgricultureEnvironment variant="auth" timeOfDay={getRealWorldTimeOfDay()} showFarmer={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-20 font-sans">
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className={`w-full ${maxWidth === 'xl' ? 'max-w-xl' : 'max-w-md'}`}>
          <div className="mb-6 text-center">
            <Link to="/" aria-label="AgriDirect Home" className="inline-flex items-center gap-2.5 group mb-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-black/40 border border-emerald-400/30 group-hover:scale-105 transition-transform">
                <Sprout className="w-7 h-7 text-amber-200" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Agri<span className="text-emerald-400">Direct</span>
              </span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-300">{subtitle}</p>}
          </div>
          <div className="rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-7 sm:p-8 space-y-5">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            © 2026 AgriDirect · Direct Farm-to-Buyer Marketplace
          </p>
        </div>
      </div>
    </AgricultureEnvironment>
  )
}