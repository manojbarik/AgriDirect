import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'

interface CartButtonProps {
  count: number
}

export function CartButton({ count }: CartButtonProps) {
  return (
    <Link
      to="/consumer/cart"
      className="relative inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-[var(--primary-emerald)] hover:text-[var(--primary-emerald)] transition-colors"
      aria-label={`Cart, ${count} items`}
    >
      <Receipt className="w-3.5 h-3.5" />
      <span>{count}</span>
    </Link>
  )
}