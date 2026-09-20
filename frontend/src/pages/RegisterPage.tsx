import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import type { Role } from '../api/auth'
import { apiErrorMessage, emailError, normalizePhone, phoneError } from '../api/auth'
import { Phone, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { AuthCard } from '../layouts'

const ROLES: Array<{ value: Role; title: string; subtitle: string; glyph: string }> = [
  { value: 'FARMER', title: 'Farmer', subtitle: 'Sell harvests & direct contracts', glyph: '🌾' },
  { value: 'BUYER', title: 'Buyer', subtitle: 'Source crops & post demands', glyph: '🛒' },
  { value: 'BULK_BUYER', title: 'Enterprise', subtitle: 'FPO / processor procurement', glyph: '🏢' },
  { value: 'CONSUMER', title: 'Consumer', subtitle: 'Fresh produce direct buying', glyph: '🧺' },
  { value: 'LOGISTICS', title: 'Logistics', subtitle: 'Fleet tracking & dispatch', glyph: '🚚' },
  { value: 'ADMIN', title: 'Admin', subtitle: 'Platform audit & arbitration', glyph: '🛡️' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('FARMER')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsAlreadyRegistered(false)
    const invalid = phoneError(phone)
    if (invalid) {
      setError(invalid)
      return
    }
    const invalidEmail = emailError(email)
    if (invalidEmail) {
      setError(invalidEmail)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register(phone, email, role, password)
      navigate('/verify', { replace: true })
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      if (msg.toLowerCase().includes('already registered')) {
        setIsAlreadyRegistered(true)
      }
      setSubmitting(false)
    }
  }

  const formatted = normalizePhone(phone)

  return (
    <AuthCard
      maxWidth="xl"
      title="Create your AgriDirect Account"
      subtitle="Join India's direct farmer-to-buyer agricultural network."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Role Selection 2x3 Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                  Select Account Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ROLES.map((option) => {
                    const isSelected = role === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        aria-pressed={isSelected}
                        className={clsx(
                          'p-3.5 rounded-xl text-left transition-all border relative flex flex-col justify-between min-h-[96px] cursor-pointer',
                          isSelected
                            ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-2xl">{option.glyph}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="mt-2">
                          <span className="block text-sm font-bold text-white leading-tight">
                            {option.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-1">
                            {option.subtitle}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Form Input Fields (h-12, w-full, px-4, rounded-xl) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phone Number (E.164)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      setError(null)
                    }}
                    placeholder="+91 98500 12345"
                    required
                    autoComplete="tel"
                    className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  {formatted !== '+91' && formatted.length >= 8 && (
                    <span className="mt-1 block text-[11px] text-emerald-400">
                      Standardized format: <span className="font-semibold">{formatted}</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError(null)
                    }}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Your OTP verification code will be sent to this email.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError(null)
                    }}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Stored as a cryptographic bcrypt hash.
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-4 text-xs text-rose-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {isAlreadyRegistered && (
                    <div className="pt-2 flex items-center gap-3 text-xs border-t border-rose-500/20">
                      <Link to="/login" className="font-bold text-amber-300 hover:underline">
                        → Sign in with your password
                      </Link>
                      <Link to="/forgot-password" className="text-slate-300 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Creating account…' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

        <div className="pt-4 border-t border-slate-800 text-center space-y-2 text-xs">
          <p className="text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-400 hover:underline">
              Sign in
            </Link>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to marketplace</span>
          </Link>
        </div>
      </AuthCard>
  )
}