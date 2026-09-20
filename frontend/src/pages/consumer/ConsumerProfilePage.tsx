import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { PageHeader } from '../../layouts'
import { ShoppingBag, ShieldCheck, LogOut, Package, Heart } from 'lucide-react'

export default function ConsumerProfilePage() {
  const { user, logout } = useAuth()

  const initial = (user?.email?.[0] ?? 'U').toUpperCase()
  const name =
    user?.email?.split('@')[0]?.split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') ||
    'Guest'

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PageHeader title="Profile" />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-5">
        <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-2xl font-black flex items-center justify-center">
            {initial}
          </div>
          <div>
            <h2 className="text-lg font-black text-neutral-900">{name}</h2>
            <p className="text-xs text-neutral-500">{user?.email}</p>
            <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 text-[10px] font-bold uppercase">
              Consumer
            </span>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-sm font-black text-neutral-900 mb-3">Shopping</h3>
          <div className="space-y-1">
            <Link
              to="/consumer/marketplace"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-neutral-50 text-sm font-semibold text-neutral-700"
            >
              <ShoppingBag className="w-4 h-4 text-primary-600" /> Browse marketplace
            </Link>
            <Link
              to="/consumer/cart"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-neutral-50 text-sm font-semibold text-neutral-700"
            >
              <Package className="w-4 h-4 text-primary-600" /> My cart
            </Link>
            <Link
              to="/consumer/community"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-neutral-50 text-sm font-semibold text-neutral-700"
            >
              <Heart className="w-4 h-4 text-primary-600" /> Community
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-sm font-black text-neutral-900 mb-3">Trust & Safety</h3>
          <div className="flex items-start gap-3 rounded-2xl bg-primary-50 border border-primary-100 p-4 text-xs text-neutral-600">
            <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0" />
            <span>
              Your payments are held in <strong>escrow</strong> and only released once your produce is
              delivered and quality-confirmed. Shop with confidence.
            </span>
          </div>
        </section>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 text-rose-600 py-3.5 text-sm font-black border border-rose-100"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>
      
    </div>
  )
}
