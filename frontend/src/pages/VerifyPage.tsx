import { useRef, useState, useEffect } from 'react'
import type { FormEvent, KeyboardEvent, ClipboardEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { apiErrorMessage } from '../api/auth'
import { ArrowRight, RefreshCw, KeyRound, CheckCircle2, Loader2, TimerOff } from 'lucide-react'
import { AuthCard } from '../layouts'

const OTP_LENGTH = 6

export default function VerifyPage() {
  const { pendingChallenge, verify, resend } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [expired, setExpired] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const code = otp.join('')

  useEffect(() => {
    if (!pendingChallenge) return
    const checkExpiry = () => setExpired(new Date(pendingChallenge.expires_at).getTime() <= Date.now())
    checkExpiry()
    const timer = setInterval(checkExpiry, 1000)
    return () => clearInterval(timer)
  }, [pendingChallenge])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!pendingChallenge) {
    return <Navigate to={verified ? '/account' : '/login'} replace />
  }

  const focusIndex = (index: number) => {
    const input = inputRefs.current[index]
    if (input) input.focus()
  }

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    setOtp((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < OTP_LENGTH - 1) focusIndex(index + 1)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    setOtp((prev) => {
      const next = prev.map((d, i) => digits[i] ?? d)
      return next
    })
    focusIndex(Math.min(digits.length, OTP_LENGTH - 1))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await verify(code)
      setVerified(true)
      navigate('/account', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setError(null)
    setResending(true)
    setResendSuccess(false)
    try {
      await resend()
      setResendSuccess(true)
      setCountdown(30)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCard
      title="Verify Security Code"
      subtitle={
        <>
          Enter the 6-digit OTP sent to{' '}
          <strong className="text-emerald-400 font-semibold">{pendingChallenge.email}</strong>
        </>
      }
    >
      {resendSuccess && (
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-400/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>A new verification code has been dispatched to your email.</span>
        </div>
      )}

            {expired && (
              <div className="rounded-xl bg-rose-950/50 border border-rose-500/40 p-3 text-xs text-rose-200 flex items-center gap-2">
                <TimerOff className="w-4 h-4 text-rose-400 shrink-0" />
                <span>This code has expired. Request a new one.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>6-Digit Verification Code</span>
                </label>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      value={otp[index]}
                      onChange={(event) => setDigit(index, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      onPaste={handlePaste}
                      aria-label={`Digit ${index + 1}`}
                      autoComplete="one-time-code"
                      autoFocus={index === 0}
                      className="w-11 sm:w-12 h-12 sm:h-14 text-center text-2xl font-bold rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs font-semibold text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={otp.join('').length !== OTP_LENGTH || submitting}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP…</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Access Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>
                  {resending
                    ? 'Sending…'
                    : countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Resend OTP Code'}
                </span>
              </button>

              <Link to="/login" className="text-slate-400 hover:text-white transition">
                Cancel & Sign in
              </Link>
            </div>
      </AuthCard>
  )
}