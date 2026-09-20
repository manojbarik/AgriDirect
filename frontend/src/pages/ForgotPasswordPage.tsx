import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import type { ForgotPasswordResponse } from '../api/auth'
import { apiErrorMessage, identifierError, requestPasswordReset } from '../api/auth'
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthCard } from '../layouts'

type Stage = 'form' | 'sending' | 'sent'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [identifier, setIdentifier] = useState(user?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number>(30)
  const [stage, setStage] = useState<Stage>('form')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const invalid = identifierError(identifier)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setStage('sending')
    try {
      const response = await requestPasswordReset(identifier)
      const data = response.data as ForgotPasswordResponse
      setResetToken(data.mock_reset_token)
      setExpiresIn(data.expires_in_minutes)
      setStage('sent')
    } catch (err) {
      setError(apiErrorMessage(err))
      setStage('form')
    }
  }

  return (
    <AuthCard
      title={stage === 'sent' ? 'Check your inbox' : 'Reset password'}
      subtitle={
        stage === 'sent'
          ? 'Check your inbox for a secure reset link.'
          : 'Enter your registered email or phone number and we will send a reset link.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {stage === 'sent' ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-200">
                  If an account exists for <span className="font-semibold text-emerald-400">{identifier.trim()}</span>,
                  a password reset link has been sent.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  The link expires in {expiresIn} minutes and can be used only once.
                </p>
              </div>
            </div>

            {resetToken ? (
              <button
                type="button"
                onClick={() => navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
              >
                Continue with demo reset link
              </button>
            ) : (
              <p className="text-xs text-slate-400">
                This environment does not return a demo reset token. Open the reset
                link from your email to continue.
              </p>
            )}

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email or phone number</span>
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  setError(null)
                }}
                placeholder="you@example.com or +91 9850012345"
                autoComplete="email"
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
              disabled={stage === 'sending'}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {stage === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending reset link…
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </form>
    </AuthCard>
  )
}