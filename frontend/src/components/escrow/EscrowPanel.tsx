import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import { getEscrowByOrder, ESCROW_STATUS_BADGE_TONE, type EscrowAccount } from '../../api/escrow'
import { StatusBadge } from '../ui/StatusBadge'
import { ShieldCheck, LockKeyhole, Landmark } from 'lucide-react'

interface EscrowPanelProps {
  orderId: string
}

export function EscrowPanel({ orderId }: EscrowPanelProps) {
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getEscrowByOrder(orderId)
      .then(({ data }) => {
        if (!cancelled) {
          setEscrow(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <section className="rounded-xl border border-[#e7ece3] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">Escrow Secured</p>
        <p className="mt-2 text-xs text-[#60736b] animate-pulse">Loading escrow snapshot…</p>
      </section>
    )
  }

  if (!escrow || error) {
    return (
      <section className="rounded-xl border border-[#e7ece3] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">Escrow Secured</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#60736b]">
            <LockKeyhole className="w-3.5 h-3.5" />
            Not funded yet
          </span>
        </div>
        <p className="mt-2 text-xs text-[#60736b]">
          No escrow account recorded yet. Once the buyer pays, funds are locked here and released
          to the farmer on quality confirmation.
        </p>
      </section>
    )
  }

  const deposited = Number(escrow.amount_deposited).toLocaleString('en-IN')
  const held = Number(escrow.amount_held).toLocaleString('en-IN')
  const released = Number(escrow.amount_released).toLocaleString('en-IN')
  const refunded = Number(escrow.amount_refunded).toLocaleString('en-IN')

  return (
    <section className="rounded-xl border border-[#e7ece3] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#258568]" />
          Escrow Secured
        </p>
        <StatusBadge
          label={escrow.status}
          tone={ESCROW_STATUS_BADGE_TONE[escrow.status] ?? 'neutral'}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#e7ece3] p-3">
          <span className="block text-[10px] uppercase font-bold text-[#60736b]">Deposited</span>
          <span className="text-base font-bold text-[#37474f]">₹{deposited}</span>
        </div>
        <div className="rounded-lg border border-[#e7ece3] p-3">
          <span className="block text-[10px] uppercase font-bold text-[#60736b]">Held in escrow</span>
          <span className="text-base font-bold text-[#258568]">₹{held}</span>
        </div>
        <div className="rounded-lg border border-[#e7ece3] p-3">
          <span className="block text-[10px] uppercase font-bold text-[#60736b]">Released</span>
          <span className="text-base font-bold text-primary-700">₹{released}</span>
        </div>
        <div className="rounded-lg border border-[#e7ece3] p-3">
          <span className="block text-[10px] uppercase font-bold text-[#60736b]">Refunded</span>
          <span className="text-base font-bold text-[#b3261e]">₹{refunded}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#60736b]">
        <span className="flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" />
          Funds released to farmer on quality confirmation{escrow.released_at ? ` · ${new Date(escrow.released_at).toLocaleString()}` : ''}
        </span>
        {escrow.deposited_at && (
          <span>Deposited {new Date(escrow.deposited_at).toLocaleString()}</span>
        )}
      </div>
    </section>
  )
}