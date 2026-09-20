import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { apiErrorMessage, loginIdentifierError } from '../api/auth'
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import { AuthCard } from '../layouts'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const invalid = loginIdentifierError(email)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      if (redirect) {
        navigate(redirect, { replace: true })
      } else if (user && user.role === 'ADMIN') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/account', { replace: true })
      }
    } catch (err) {
      setError(apiErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with your registered email or phone number."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>Email or Phone Number</span>
          </label>
                <input
                  type="text"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError(null)
                  }}
                  placeholder="you@example.com or +91..."
                  required
                  autoComplete="username"
                  className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Password</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl px-4 text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-3.5 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-sm font-bold text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Signing in…' : 'Sign in to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

        <div className="pt-4 border-t border-slate-800 text-center space-y-2 text-xs">
          <p className="text-slate-300">
            New to AgriDirect?{' '}
            <Link to="/register" className="font-bold text-emerald-400 hover:underline">
              Create free account
            </Link>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to marketplace home</span>
          </Link>
        </div>
      </AuthCard>
  )
}