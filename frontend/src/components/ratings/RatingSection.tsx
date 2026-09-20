import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  createRating,
  getOrderRatingState,
  type OrderRatingState,
  type RatingOut,
} from '../../api/ratings'

export function Stars({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-xl' : 'text-base'
  return (
    <span className={`${sizeClass} leading-none`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= value ? 'text-[#d98a00]' : 'text-[#d9e3d6]'}>
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewRow({ rating }: { rating: RatingOut }) {
  return (
    <div className="rounded-lg border border-[#e7ece3] bg-[#fafcfa] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#37474f]">
          {rating.reviewer_name}
          <span className="ml-2 rounded-full bg-[#e7f3ee] px-2 py-0.5 text-xs font-bold text-[#1b6f58]">
            {rating.reviewer_role}
          </span>
        </p>
        <Stars value={rating.rating} />
      </div>
      {rating.comment && <p className="mt-1 text-sm text-[#60736b]">{rating.comment}</p>}
      <p className="mt-1 text-xs text-[#8ba096]">
        {new Date(rating.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}

export default function RatingSection({ orderId }: { orderId: string }) {
  const [state, setState] = useState<OrderRatingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState('')

  useEffect(() => {
    let cancelled = false
    getOrderRatingState(orderId)
      .then(({ data }) => {
        if (!cancelled) setState(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (error)
    return <p className="text-sm font-semibold text-red-700">{error}</p>
  if (!state) return null

  const handleSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      await createRating({ order_id: orderId, rating: selected, comment: comment.trim() || undefined })
      const { data } = await getOrderRatingState(orderId)
      setState(data)
      setSelected(0)
      setComment('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#d9e3d6] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">Ratings & reviews</p>

      {state.can_rate && (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-[#37474f]">
            How was your experience on this order?
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={busy}
                onClick={() => setSelected(star)}
                className={`text-2xl leading-none disabled:opacity-60 ${
                  star <= selected ? 'text-[#d98a00]' : 'text-[#d9e3d6]'
                }`}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share a short review (optional)"
            aria-label="Written review"
            className="w-full resize-none rounded-lg border border-[#d9e3d6] bg-[#fafcfa] p-3 text-sm text-[#37474f] outline-none focus:border-[#258568]"
          />
          <button
            type="button"
            disabled={busy || selected === 0}
            onClick={handleSubmit}
            className="rounded-full bg-[#18352c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Submit review
          </button>
        </div>
      )}

      {(state.my_rating || state.counterpart_rating) && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {state.my_rating && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">Your review</p>
              <div className="mt-1.5">
                <ReviewRow rating={state.my_rating} />
              </div>
            </div>
          )}
          {state.counterpart_rating && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
                {state.counterpart_rating.reviewer_role === 'BUYER' ? 'Farmer' : 'Buyer'}'s review
              </p>
              <div className="mt-1.5">
                <ReviewRow rating={state.counterpart_rating} />
              </div>
            </div>
          )}
        </div>
      )}

      {!state.can_rate && !state.my_rating && !state.counterpart_rating && (
        <p className="mt-3 text-sm text-[#60736b]">
          Reviews open once the order is completed.
        </p>
      )}
    </section>
  )
}