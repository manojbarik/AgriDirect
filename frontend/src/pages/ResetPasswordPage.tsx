import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { apiErrorMessage } from '../api/auth'
import { Lock, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { AuthCard } from '../layouts'

type Stage = 'form' | 'submitting' | 'done' | 'error'

function passwordStrength(password: string): { score: number; label: string } | null {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  const label =
    score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
  return { score: Math.min(score, 4), label }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('form')

  const strength = useMemo(() => passwordStrength(password), [password])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    setStage('submitting')
    try {
      await resetPassword(token, password)
      setStage('done')
    } catch (err) {
      const message = apiErrorMessage(err)
      setError(message)
      setStage(message.includes('expired') ? 'error' : 'form')
    }
  }

  return (
    <AuthCard
      title={stage === 'done' ? 'Password updated' : 'Choose a new password'}
      subtitle={
        stage === 'done'
          ? 'You can now sign in with your new password.'
          : 'Your reset link is valid for a limited time and can be used once.'
      }
    >
      {stage === 'done' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-200">Your password was reset successfully.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
          >
            Sign in with your new password
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!token ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-300">This reset link is missing or malformed.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Use the link from the reset email, or request a new one.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New password</span>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </label>

              {strength && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`flex-1 rounded-full transition-colors ${
                          bar < strength.score ? 'bg-emerald-500' : 'bg-slate-700/60'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">{strength.label} password</p>
                </div>
              )}

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Confirm new password</span>
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value)
                    setError(null)
                  }}
                  placeholder="Re-enter your new password"
                  required
                  autoComplete="new-password"
                  className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </label>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs font-semibold text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={stage === 'submitting'}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {stage === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving new password…
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      )}
    </AuthCard>
  )
}