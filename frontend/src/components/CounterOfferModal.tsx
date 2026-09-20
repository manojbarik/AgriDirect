import { useState } from 'react'
import type { FormEvent } from 'react'
import type { OrderDetail } from '../api/orders'

export function CounterOfferModal({
  order,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  order: OrderDetail
  submitting: boolean
  error: string | null
  onSubmit: (payload: {
    quantity: string
    unit: string
    price: string
    delivery_date: string
    note?: string
  }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    quantity: order.pending_offer_quantity ?? order.agreed_quantity ?? order.requested_quantity,
    unit: order.pending_offer_unit ?? order.agreed_unit ?? order.unit,
    price: order.pending_offer_price ?? order.agreed_price ?? order.requested_price,
    delivery_date: order.pending_offer_delivery_date ?? order.requested_delivery_date ?? '',
    note: '',
  })

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      quantity: form.quantity,
      unit: form.unit,
      price: form.price,
      delivery_date: form.delivery_date,
      note: form.note || undefined,
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6"
      >
        <p className="font-bold">Submit counter-offer</p>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        <label className="block">
          <span className="text-sm font-semibold">Quantity</span>
          <input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => set('quantity')(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Unit</span>
          <input type="text" value={form.unit} onChange={(event) => set('unit')(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Price per {form.unit} (INR)</span>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => set('price')(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Preferred delivery date</span>
          <input type="date" value={form.delivery_date} onChange={(event) => set('delivery_date')(event.target.value)} required className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Note</span>
          <textarea value={form.note} onChange={(event) => set('note')(event.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2" />
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-full bg-[#18352c] px-6 py-2 font-semibold text-white disabled:opacity-60">
            {submitting ? 'Sending…' : 'Send counter-offer'}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-[#18352c] px-6 py-2 font-semibold text-[#18352c]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}