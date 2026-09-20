import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import TrustScoreSection from '../components/trust/TrustScoreSection'
import { Card } from '../components/ui'
import { PageContainer, PageHeader } from '../layouts'
import { 
  Phone, 
  Shield, 
  LogOut, 
  Bell, 
  ArrowRight
} from 'lucide-react'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <PageContainer narrow>
      <PageHeader
        title="Account Overview"
        description="Manage your verified identity, credentials, role privileges, and trust metrics."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-sm border border-[var(--primary-emerald)]/30 font-display">
              {user.role === 'FARMER' ? '🌾' : user.role === 'BUYER' ? '🛒' : '⚡'}
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-[var(--primary-emerald)] tracking-wider">
                Verified Account
              </span>
              <h2 className="text-xl font-black text-[var(--text-bright)] font-display">
                {user.phone_e164}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[var(--primary-emerald)]/10 text-[var(--primary-emerald)] border border-[var(--primary-emerald)]/20">
                  {user.role}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3 text-xs">
            <div className="flex items-center justify-between text-[var(--text-main)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Phone className="w-3.5 h-3.5 text-[var(--primary-emerald)]" />
                <span>Phone Number:</span>
              </span>
              <span className="font-mono font-semibold text-[var(--text-bright)]">{user.phone_e164}</span>
            </div>

            {user.email && (
              <div className="flex items-center justify-between text-[var(--text-main)]">
                <span className="text-[var(--text-muted)]">Email:</span>
                <span className="font-semibold text-[var(--text-bright)]">{user.email}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[var(--text-main)]">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Shield className="w-3.5 h-3.5 text-primary-700" />
                <span>Access Level:</span>
              </span>
              <span className="font-semibold text-primary-700">{user.role} Permissions</span>
            </div>
          </div>

          {/* Quick Actions per role */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
            {user.role === 'FARMER' && (
              <>
                <Link
                  to="/farmer/dashboard"
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 text-white font-bold text-xs flex items-center justify-between shadow-sm transition-all"
                >
                  <span>Farmer Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/farmer/onboarding"
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 font-semibold text-xs flex items-center justify-between transition-all"
                >
                  <span>Farm Setup & KYC</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}

            {user.role === 'BUYER' && (
              <>
                <Link
                  to="/buyer/dashboard"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-stone-950 font-bold text-xs flex items-center justify-between hover:brightness-110 shadow-sm transition-all"
                >
                  <span>Buyer Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/buyer/onboarding"
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 font-semibold text-xs flex items-center justify-between transition-all"
                >
                  <span>Business Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs flex items-center justify-between hover:brightness-110 shadow-sm transition-all"
                >
                  <span>Admin Management Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/admin/disputes"
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 font-semibold text-xs flex items-center justify-between transition-all"
                >
                  <span>Disputes Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-2 transition-all mt-3"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of AgriDirect</span>
            </button>
          </div>
        </div>

        {/* Trust Score & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {user.role !== 'ADMIN' ? (
            <TrustScoreSection />
          ) : (
            <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-[var(--text-bright)] font-display">
                System Administration Authority
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                As an administrator, you oversee verified dispute resolutions, KYC audits, and platform trust metrics across all registered farmers and buyers.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/admin/disputes"
                  className="px-4 py-2 rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 text-white text-xs font-bold"
                >
                  Disputes Manager
                </Link>
                <Link
                  to="/admin/verifications"
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold hover:border-[var(--primary-emerald)]/50"
                >
                  KYC Verifications
                </Link>
                <Link
                  to="/admin/trust-scores"
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold hover:border-[var(--primary-emerald)]/50"
                >
                  Trust Engines
                </Link>
              </div>
            </div>
          )}

          <Card className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-bright)] font-display">Notifications & Alert Center</h4>
              <p className="text-xs text-[var(--text-muted)]">View real-time order status, counter offers and AI updates</p>
            </div>
            <Link
              to="/notifications"
              className="px-4 py-2 rounded-xl bg-[var(--primary-emerald)]/10 hover:bg-[var(--primary-emerald)]/20 border border-[var(--primary-emerald)]/20 text-[var(--primary-emerald)] text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Open Notifications</span>
            </Link>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}