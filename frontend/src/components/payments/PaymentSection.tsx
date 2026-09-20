import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  confirmPayment,
  createPaymentIntent,
  getOrderPayments,
  getOrderSettlement,
  type Payment,
  type Settlement,
  PAYMENT_STATUS_TONE,
  OPERATION_LABELS,
} from '../../api/payments'
import { StatusBadge } from '../ui/StatusBadge'

type PaymentSectionProps = {
  orderId: string
  myRole: string
  orderStatus: string
  orderType?: string
  totalAmount: string
  onOrderChanged: () => void
}

type PaymentModalState = {
  operation: 'ADVANCE' | 'BALANCE'
  payment: Payment | null
  error: string | null
  busy: boolean
} | null

const isCaptured = (payment: Payment) => ['PAID', 'SETTLED'].includes(payment.status)

export function PaymentSection({
  orderId,
  myRole,
  orderStatus,
  orderType = 'B2B',
  totalAmount,
  onOrderChanged,
}: PaymentSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<PaymentModalState>(null)

  const refresh = useCallback(() => {
    let cancelled = false
    Promise.all([getOrderPayments(orderId), getOrderSettlement(orderId)])
      .then(([paymentsResp, settlementResp]) => {
        if (cancelled) return
        setPayments(paymentsResp.data)
        setSettlement(settlementResp.data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  useEffect(() => {
    const cleanup = refresh()
    return cleanup
  }, [refresh])

  const advancePaid = payments.some((p) => p.operation === 'ADVANCE' && isCaptured(p))
  const balancePaid = payments.some((p) => p.operation === 'BALANCE' && p.status !== 'FAILED')
  const b2cPayableStatuses = new Set([
    'ACCEPTED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'IN_TRANSIT',
    'DELIVERED',
    'QUALITY_CHECK',
  ])
  const isPurchaser = myRole === 'BUYER' || myRole === 'CONSUMER'
  const balancePayable =
    orderType === 'B2C'
      ? isPurchaser && !balancePaid && b2cPayableStatuses.has(orderStatus)
      : (orderStatus === 'QUALITY_CHECK' || orderStatus === 'COMPLETED') && !balancePaid

  const openModal = async (operation: 'ADVANCE' | 'BALANCE') => {
    setModal({ operation, payment: null, error: null, busy: true })
    setError(null)
    try {
      const { data } = await createPaymentIntent({
        order_id: orderId,
        operation,
        idempotency_key: `${operation}-${crypto.randomUUID()}`,
      })
      setModal((current) =>
        current ? { ...current, payment: data, busy: false } : current,
      )
    } catch (err) {
      setModal((current) =>
        current ? { ...current, error: apiErrorMessage(err), busy: false } : current,
      )
    }
  }

  const confirmInSandbox = async () => {
    if (!modal?.payment) return
    setModal({ ...modal, busy: true, error: null })
    try {
      const { data } = await confirmPayment(modal.payment.id)
      setModal({ ...modal, payment: data, busy: false })
      refresh()
      onOrderChanged()
    } catch (err) {
      setModal({ ...modal, error: apiErrorMessage(err), busy: false })
    }
  }

  const deliverable =
    orderType !== 'B2C' && orderStatus === 'ACCEPTED' && myRole === 'BUYER' && !advancePaid

  return (
    <section className="rounded-xl border border-[#d9e3d6] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
          Payments
        </p>
        <div className="flex gap-2">
          {deliverable && (
            <button
              type="button"
              onClick={() => void openModal('ADVANCE')}
              className="rounded-full bg-[#18352c] px-4 py-1.5 text-sm font-semibold text-white"
            >
              Pay advance (20% of ₹{totalAmount})
            </button>
          )}
          {balancePayable && (
            <button
              type="button"
              onClick={() => void openModal('BALANCE')}
              className="rounded-full bg-[#258568] px-4 py-1.5 text-sm font-semibold text-white"
            >
              {orderType === 'B2C' ? `Pay now (₹${totalAmount})` : 'Pay remaining balance'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-[#60736b]">
          {orderType === 'B2C'
            ? 'No payments yet. Consumers pay the full amount once the farmer accepts the order.'
            : 'No payments yet. Buyers pay a small advance once the farmer accepts, and the remaining balance after quality confirmation.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e7ece3] px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[#37474f]">
                  {OPERATION_LABELS[payment.operation] ?? payment.operation} · ₹{payment.amount}
                  <span className="ml-2 text-xs font-normal text-[#60736b]">
                    {new Date(payment.created_at).toLocaleString()}
                  </span>
                </p>
                {payment.provider_reference && (
                  <p className="text-xs text-[#60736b]">Provider ref: {payment.provider_reference}</p>
                )}
                {payment.failure_code && (
                  <p className="text-xs text-[#b3261e]">Failure: {payment.failure_code}</p>
                )}
              </div>
              <StatusBadge
                label={payment.status}
                tone={PAYMENT_STATUS_TONE[payment.status] ?? 'neutral'}
              />
            </li>
          ))}
        </ul>
      )}

      {settlement && (
        <div className="mt-4 rounded-lg bg-primary-50 border border-primary-200 p-3 text-sm">
          <p className="font-semibold text-primary-700">Settlement released to farmer</p>
          <p className="text-primary-700">
            Gross ₹{settlement.gross_amount} · Fee ₹{settlement.fee_amount} · Net ₹
            {settlement.net_amount}
          </p>
          {(settlement.payouts ?? []).map((payout) => (
            <p key={payout.id} className="mt-1 text-xs text-primary-700">
              Payout ₹{payout.amount} · {payout.status}
            </p>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6"
          >
            <p className="font-bold">Sandbox payment — {OPERATION_LABELS[modal.operation]}</p>
            <p className="text-sm text-[#60736b]">
              This is a demo checkout. No real money moves and no card details are entered.
              The payment is captured through the {modal.payment?.provider ?? 'mock'} sandbox
              provider.
            </p>
            {modal.payment && (
              <div className="rounded-lg border border-[#e7ece3] p-3 text-sm">
                <p className="font-semibold">Amount: ₹{modal.payment.amount}</p>
                <p className="mt-1 break-all text-xs text-[#60736b]">
                  Checkout URL: {modal.payment.checkout_url}
                </p>
              </div>
            )}
            {modal.error && <p className="text-sm font-semibold text-red-700">{modal.error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={modal.busy || !modal.payment || isCaptured(modal.payment)}
                onClick={() => void confirmInSandbox()}
                className="rounded-full bg-[#18352c] px-6 py-2 font-semibold text-white disabled:opacity-60"
              >
                {modal.busy
                  ? 'Processing…'
                  : modal.payment && modal.payment.status === 'PAID'
                    ? 'Payment captured'
                    : 'Confirm payment in sandbox'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full border border-[#18352c] px-6 py-2 font-semibold text-[#18352c]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}