import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  Package,
  Receipt,
  Send,
  ShieldCheck,
  ShieldX,
  Sprout,
  User,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import {
  getFarmerDashboard,
  getFarmerProfile,
  getFarmerStatus,
  listFarms,
  submitVerification,
  type Farm,
  type FarmerDashboard,
  type FarmerVerificationStatus,
  type OnboardingStep,
} from '../../api/farmer'
import { apiErrorMessage } from '../../api/auth'
import { PageContainer } from '../../layouts'

function VerificationBadge({ status }: { status: FarmerVerificationStatus }) {
  const cfg =
    status === 'VERIFIED'
      ? { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Verified', bg: 'var(--color-success-light)', text: 'var(--color-success)' }
      : status === 'PENDING'
      ? { icon: <Clock className="w-4 h-4" />, label: 'Pending Review', bg: 'var(--color-warning-light)', text: 'var(--color-warning)' }
      : status === 'REJECTED'
      ? { icon: <XCircle className="w-4 h-4" />, label: 'Rejected', bg: 'var(--color-error-light)', text: 'var(--color-error)' }
      : { icon: <ShieldX className="w-4 h-4" />, label: status, bg: 'var(--bg-surface)', text: 'var(--text-muted)' }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function KpiCard({ icon, label, value, tone, sub }: { icon: React.ReactNode; label: string; value: string; tone: 'emerald' | 'amber' | 'blue' | 'violet'; sub?: string }) {
  const tones = {
    emerald: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
    amber: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
    blue: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
    violet: { bg: 'var(--color-secondary-50)', text: 'var(--color-secondary-700)' },
  }
  const c = tones[tone]
  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg, color: c.text }}>{icon}</span>
      <div>
        <div className="text-2xl font-black" style={{ color: 'var(--text-bright)' }}>{value}</div>
        <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5" style={{ color: 'var(--primary-emerald)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function StepRow({ step }: { step: OnboardingStep }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {step.done
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
        : <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }} />}
      <span className="text-xs font-semibold" style={{ color: step.done ? 'var(--text-bright)' : 'var(--text-muted)' }}>{step.label}</span>
    </div>
  )
}

export default function FarmerAccountOverviewPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<FarmerDashboard | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [canSubmit, setCanSubmit] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<FarmerVerificationStatus>('PENDING')
  const [completionPercent, setCompletionPercent] = useState(0)
  const [fullName, setFullName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getFarmerDashboard().catch(() => ({ data: null })),
      getFarmerProfile().catch(() => ({ data: null })),
      getFarmerStatus().catch(() => ({ data: null })),
      listFarms().catch(() => ({ data: [] as Farm[] })),
    ]).then(([dashRes, profileRes, statusRes, farmsRes]) => {
      if (cancelled) return
      if (dashRes.data) setDashboard(dashRes.data)
      if (profileRes.data) setFullName(profileRes.data.full_name)
      if (statusRes.data) {
        setVerificationStatus(statusRes.data.verification_status)
        setCompletionPercent(statusRes.data.completion_percent)
        setSteps(statusRes.data.steps)
        setCanSubmit(statusRes.data.can_submit)
      }
      if (farmsRes.data) setFarms(farmsRes.data as Farm[])
    }).catch(err => {
      if (!cancelled) setError(apiErrorMessage(err))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleVerify = async () => {
    setVerifying(true)
    setError(null)
    try {
      const { data } = await submitVerification()
      setVerificationStatus(data.verification_status)
      setVerifySuccess(true)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setVerifying(false)
    }
  }

  const displayName = fullName || user?.email || user?.phone_e164 || 'Farmer'
  const revenue = dashboard ? Number(dashboard.earnings) : 0

  const quickLinks = [
    { label: 'My Farm', to: '/farmer/farm', icon: Sprout },
    { label: 'Products', to: '/farmer/products', icon: Package },
    { label: 'Orders', to: '/farmer/orders', icon: Receipt },
    { label: 'Profile & Settings', to: '/account', icon: User },
    { label: 'Onboarding Checklist', to: '/farmer/onboarding', icon: ClipboardList },
  ]

  return (
    <PageContainer narrow>
      {/* Header */}
      <section className="pt-2 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Account Overview</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight font-display" style={{ color: 'var(--text-bright)' }}>{displayName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerificationBadge status={verificationStatus} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{user?.email ?? user?.phone_e164}</span>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-semibold">Loading…</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/40 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400 mt-4">{error}</div>
      )}

      {!loading && (
        <>
          {/* KPIs */}
          <section className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={<BadgeIndianRupee className="w-4 h-4" />} label="Total Revenue" value={revenue ? `₹${revenue.toLocaleString('en-IN')}` : '—'} tone="emerald" />
            <KpiCard icon={<Receipt className="w-4 h-4" />} label="Total Orders" value={String(dashboard?.orders_count ?? 0)} tone="amber" />
            <KpiCard icon={<Package className="w-4 h-4" />} label="Active Listings" value={String(dashboard?.active_listings_count ?? 0)} tone="blue" sub={`${dashboard?.crops_count ?? 0} crop types`} />
            <KpiCard icon={<ShieldCheck className="w-4 h-4" />} label="Trust Score" value={dashboard?.trust_score ? String(Math.round(Number(dashboard.trust_score))) : '—'} tone="violet" sub={dashboard?.trust_band ?? undefined} />
          </section>

          {/* Main grid */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Verification Card */}
            <section className="lg:col-span-2 rounded-3xl border p-5 shadow-sm" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />Verification Status
                </h2>
                <VerificationBadge status={verificationStatus} />
              </div>

              {verificationStatus === 'VERIFIED' && (
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-success-light)' }}>
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>Your account is verified!</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-success)' }}>You can publish listings and accept orders on AgriDirect.</p>
                  </div>
                </div>
              )}
              {verificationStatus === 'PENDING' && (
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-warning-light)' }}>
                  <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-warning)' }}>Awaiting admin review</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>Your verification request has been submitted. Our admin team will review and approve or reject it shortly.</p>
                  </div>
                </div>
              )}
              {verificationStatus === 'REJECTED' && (
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-error-light)' }}>
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }}>Verification rejected</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>Please complete your profile and re-submit for verification.</p>
                  </div>
                </div>
              )}

              {verifySuccess && (
                <div className="mt-3 rounded-xl px-4 py-3 text-xs font-semibold" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                  ✓ Verification request submitted! Admin will review shortly.
                </div>
              )}

              {(verificationStatus === 'REJECTED' || (!verifySuccess && verificationStatus !== 'VERIFIED' && verificationStatus !== 'PENDING')) && (
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" onClick={handleVerify} disabled={verifying || !canSubmit}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--primary-emerald)' }}>
                    {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Request Verification</>}
                  </button>
                  {!canSubmit && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Complete all onboarding steps before submitting.</p>}
                </div>
              )}

              {/* Completion ring */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Profile Completion</span>
                  <span className="font-black" style={{ color: 'var(--primary-emerald)' }}>{completionPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completionPercent}%`, backgroundColor: 'var(--primary-emerald)' }} />
                </div>
              </div>
            </section>

            {/* Onboarding Checklist */}
            <section className="rounded-3xl border p-5 shadow-sm" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
                  <ClipboardList className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />Checklist
                </h2>
                <Link to="/farmer/onboarding" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>Setup →</Link>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {steps.length === 0
                  ? <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No steps found</p>
                  : steps.map(step => <StepRow key={step.key} step={step} />)}
              </div>
            </section>
          </div>

          {/* Farms */}
          <section className="mt-4 rounded-3xl border p-5 shadow-sm" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
                <Sprout className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />My Farms
              </h2>
              <Link to="/farmer/farm" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>Manage →</Link>
            </div>
            {farms.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Sprout className="w-10 h-10" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No farms registered yet.</p>
                <Link to="/farmer/onboarding" className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:brightness-110" style={{ backgroundColor: 'var(--primary-emerald)' }}>
                  Add your first farm <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {farms.map(farm => (
                  <div key={farm.id} className="rounded-2xl border p-3.5 flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="flex items-start gap-2">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                        <Sprout className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-bright)' }}>{farm.name}</p>
                        {farm.farming_type && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{farm.farming_type}</p>}
                      </div>
                    </div>
                    {(farm.state || farm.district) && (
                      <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{[farm.district, farm.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {farm.acreage && <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{farm.acreage} acres</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Links */}
          <section className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickLinks.map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to} className="group rounded-2xl border p-3.5 flex flex-col items-center gap-2 text-center transition hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl transition group-hover:scale-110" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </PageContainer>
  )
}
