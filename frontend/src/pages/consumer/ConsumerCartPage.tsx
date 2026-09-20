import { Link } from 'react-router-dom'
import { useCart } from '../../contexts/useCart'
import { apiErrorMessage } from '../../api/auth'
import { createOrder, type CreateOrderPayload } from '../../api/orders'
import { PageHeader } from '../../layouts'
import { useState } from 'react'
import { Loader2, Minus, Plus, Trash2, MoveLeft } from 'lucide-react'

export default function ConsumerCartPage() {
  const { items, setQty, removeItem, clearCart, totalValue, totalCount } = useCart()
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [note, setNote] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const placeOrder = async () => {
    if (items.length === 0) return
    setPlacing(true)
    setError(null)
    const today = new Date().toISOString().slice(0, 10)
    try {
      for (const item of items) {
        const payload: CreateOrderPayload = {
          listing_id: item.listing_id,
          quantity: String(item.qty),
          unit: item.unit,
          price: String(item.price),
          delivery_date: today,
          note: note || undefined,
          delivery_address_summary: address || undefined,
        }
        await createOrder(payload)
      }
      clearCart()
      setPlaced(true)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <PageHeader title="Cart" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-black font-display">Order placed!</h1>
          <p className="text-sm text-neutral-500">
            Your purchase request is with the farmer. Pay the full amount once they accept, and
            track delivery to your address.
          </p>
          <Link
            to="/consumer/orders"
            className="inline-block px-6 py-3 rounded-full bg-primary-600 text-white text-sm font-bold mt-2"
          >
            Track my orders
          </Link>
        </div>
        
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PageHeader title="Your Cart" description={`${totalCount} items`} />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-neutral-200 p-10 text-center space-y-4">
            <div className="text-5xl">🛒</div>
            <h3 className="text-lg font-black text-neutral-900">Your cart is empty</h3>
            <p className="text-xs text-neutral-500">Browse the marketplace to add fresh produce.</p>
            <Link
              to="/consumer/marketplace"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary-600 text-white text-xs font-black"
            >
              <MoveLeft className="w-4 h-4" /> Browse produce
            </Link>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <article
                key={item.listing_id}
                className="rounded-2xl bg-white border border-neutral-200 p-4 shadow-sm flex items-center gap-3"
              >
                <div className="h-14 w-14 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
                  🥬
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-neutral-900 truncate">{item.name}</h3>
                  <div className="text-[11px] text-neutral-400">₹{item.price}/{item.unit}</div>
                  <div className="mt-1 text-sm font-black text-primary-600">
                    ₹{(item.price * item.qty).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(item.listing_id, item.qty - 1)}
                    aria-label="Decrease quantity"
                    className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-black">{item.qty}</span>
                  <button
                    onClick={() => setQty(item.listing_id, item.qty + 1)}
                    aria-label="Increase quantity"
                    className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.listing_id)}
                    aria-label="Remove item"
                    className="ml-1 h-8 w-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}

            <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-black text-neutral-900">Delivery details</h2>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Delivery address"
                aria-label="Delivery address"
                className="w-full rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm outline-none"
              />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note for the farmer (optional)"
                aria-label="Note for the farmer"
                rows={2}
                className="w-full rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm outline-none resize-none"
              />
            </section>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {error}
              </div>
            )}

            <section className="sticky bottom-20 md:static rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Total ({totalCount} items)</span>
                <span className="text-xl font-black text-neutral-900">
                  ₹{totalValue.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                Payment held in escrow until delivery is confirmed.
              </p>
              <button
                onClick={placeOrder}
                disabled={placing || totalCount === 0}
                className="mt-3 w-full rounded-2xl bg-primary-600 text-white py-4 text-sm font-black disabled:opacity-50"
              >
                {placing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing…
                  </span>
                ) : (
                  'Place Order — Secured by Escrow'
                )}
              </button>
            </section>
          </>
        )}
      </div>
      
    </div>
  )
}
