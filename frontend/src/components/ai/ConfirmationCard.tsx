import React from 'react'
import { ShieldCheck, Check, X, AlertTriangle } from 'lucide-react'
import type { PendingAction } from '../../contexts/AssistantContext'

interface ConfirmationCardProps {
  action: PendingAction
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const isOrder = action.action_type === 'create_order'

  return (
    <div className="my-3 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-emerald-950/40 to-slate-900/90 p-4 shadow-xl text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-amber-500/20">
        <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Authorization Required
          </h4>
          <p className="text-sm font-semibold text-white">{action.title}</p>
        </div>
      </div>

      {/* Details Table */}
      <div className="my-3 space-y-1.5 text-xs">
        {action.crop && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Crop / Commodity:</span>
            <span className="font-semibold text-emerald-300">{action.crop}</span>
          </div>
        )}
        {action.quantity && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Quantity:</span>
            <span className="font-semibold text-white">{action.quantity}</span>
          </div>
        )}
        {action.grade && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Quality Grade:</span>
            <span className="font-semibold text-amber-300">{action.grade}</span>
          </div>
        )}
        {action.unit_price && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Unit Price:</span>
            <span className="font-semibold text-white">{action.unit_price}</span>
          </div>
        )}
        {action.price_per_quintal && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Price / Quintal:</span>
            <span className="font-semibold text-white">{action.price_per_quintal}</span>
          </div>
        )}
        {action.total_amount && (
          <div className="flex justify-between py-1.5 border-b border-slate-800 font-bold text-sm">
            <span className="text-emerald-400">Total Valuation:</span>
            <span className="text-amber-300">{action.total_amount}</span>
          </div>
        )}
        {action.seller && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Counterparty:</span>
            <span className="text-slate-200">{action.seller}</span>
          </div>
        )}
        {action.location && (
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Location:</span>
            <span className="text-slate-200">{action.location}</span>
          </div>
        )}
      </div>

      {/* Escrow Badge */}
      {action.escrow_protected && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>AgriDirect Escrow Protection will hold funds until delivery is verified.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-transform active:scale-95"
        >
          <Check className="h-3.5 w-3.5" />
          <span>{isOrder ? 'Confirm Order' : 'Publish Listing'}</span>
        </button>
      </div>
    </div>
  )
}
