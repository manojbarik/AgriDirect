import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminTable, { StatusBadge, type AdminColumn } from '../../components/admin/AdminTable'
import { fmtDate, fmtNum } from '../../components/admin/adminUtils'
import { apiErrorMessage } from '../../api/auth'
import { PageContainer } from '../../layouts'
import {
  getAdminAiPredictions,
  getAdminDeliveries,
  getAdminDemands,
  getAdminListings,
  getAdminOrders,
  getAdminPayments,
  getAdminQualityChecks,
  getAdminRefunds,
  getAdminReviews,
  getAdminUsers,
} from '../../api/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const unwrap = <T,>(call: Promise<{ data: T[] }>): Promise<Row[]> =>
  call.then((res) => res.data as unknown as Row[])

interface SectionConfig {
  title: string
  subtitle: string
  load: () => Promise<Row[]>
  columns: AdminColumn<Row>[]
}

const SECTIONS: Record<string, SectionConfig> = {
  users: {
    title: 'Users',
    subtitle: 'Everyone registered on the platform (sanitized — no passwords or OTPs).',
    load: () => unwrap(getAdminUsers()),
    columns: [
      { key: 'phone_e164', label: 'Phone', render: (r) => <span className="font-mono text-xs">{r.phone_e164}</span> },
      { key: 'email', label: 'Email', render: (r) => r.email ?? '—' },
      { key: 'role', label: 'Role', render: (r) => <StatusBadge status={String(r.role ?? '—')} /> },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'created_at', label: 'Joined', render: (r) => fmtDate(r.created_at) },
    ],
  },
  listings: {
    title: 'Crop listings',
    subtitle: 'All crop listings across the marketplace.',
    load: () => unwrap(getAdminListings()),
    columns: [
      { key: 'crop', label: 'Crop' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'unit_price', label: 'Price', render: (r) => `₹${fmtNum(r.unit_price)}` },
      { key: 'available_quantity', label: 'Quantity', render: (r) => `${fmtNum(r.available_quantity, 0)} ${r.unit ?? ''}` },
      { key: 'state', label: 'Location', render: (r) => r.state ?? '—' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
  demands: {
    title: 'Buyer demands',
    subtitle: 'Demand requests published by buyers.',
    load: () => unwrap(getAdminDemands()),
    columns: [
      { key: 'crop', label: 'Crop' },
      { key: 'buyer', label: 'Buyer' },
      { key: 'quantity', label: 'Quantity', render: (r) => `${fmtNum(r.quantity, 0)} ${r.unit ?? ''}` },
      { key: 'max_price', label: 'Max price', render: (r) => (r.max_price ? `₹${fmtNum(r.max_price)}` : '—') },
      { key: 'location', label: 'Location', render: (r) => r.location ?? '—' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
  orders: {
    title: 'Orders',
    subtitle: 'All marketplace orders and their lifecycle status.',
    load: () => unwrap(getAdminOrders()),
    columns: [
      { key: 'order_number', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order_number}</span> },
      { key: 'crop', label: 'Crop', render: (r) => r.crop ?? '—' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'buyer', label: 'Buyer' },
      { key: 'total_amount', label: 'Amount', render: (r) => `₹${fmtNum(r.total_amount)}` },
      { key: 'source', label: 'Source', render: (r) => String(r.source ?? '—').replace(/_/g, ' ') },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
  payments: {
    title: 'Payments',
    subtitle: 'Advance and balance payments captured on the platform.',
    load: () => unwrap(getAdminPayments()),
    columns: [
      { key: 'order', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order}</span> },
      { key: 'operation', label: 'Type', render: (r) => <StatusBadge status={String(r.operation ?? '—')} /> },
      { key: 'amount', label: 'Amount', render: (r) => `₹${fmtNum(r.amount)} ${r.currency ?? ''}` },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'provider', label: 'Provider', render: (r) => r.provider ?? '—' },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
  deliveries: {
    title: 'Deliveries',
    subtitle: 'Delivery lifecycle for fulfilled orders.',
    load: () => unwrap(getAdminDeliveries()),
    columns: [
      { key: 'order', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order}</span> },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'destination', label: 'Destination', render: (r) => r.destination ?? '—' },
      { key: 'picked_up_at', label: 'Picked up', render: (r) => fmtDate(r.picked_up_at) },
      { key: 'delivered_at', label: 'Delivered', render: (r) => fmtDate(r.delivered_at) },
    ],
  },
  quality: {
    title: 'Quality checks',
    subtitle: 'Per-batch quality verification results.',
    load: () => unwrap(getAdminQualityChecks()),
    columns: [
      { key: 'order', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order}</span> },
      { key: 'batch', label: 'Batch', render: (r) => <span className="font-mono text-xs">{r.batch}</span> },
      { key: 'result', label: 'Result', render: (r) => <StatusBadge status={String(r.result ?? '—')} /> },
      { key: 'grade', label: 'Grade', render: (r) => r.grade ?? '—' },
      { key: 'quantity_received', label: 'Received', render: (r) => (r.quantity_received ? `${fmtNum(r.quantity_received)} kg` : '—') },
      { key: 'damaged_quantity', label: 'Damaged', render: (r) => (r.damaged_quantity ? `${fmtNum(r.damaged_quantity)} kg` : '—') },
      { key: 'checked_at', label: 'Checked', render: (r) => fmtDate(r.checked_at) },
    ],
  },
  refunds: {
    title: 'Refunds',
    subtitle: 'Refund decisions issued by administrators.',
    load: () => unwrap(getAdminRefunds()),
    columns: [
      { key: 'refund_id', label: 'Refund', render: (r) => <span className="font-mono text-xs">{String(r.refund_id).slice(0, 8)}</span> },
      { key: 'payment_id', label: 'Payment', render: (r) => <span className="font-mono text-xs">{String(r.payment_id).slice(0, 8)}</span> },
      { key: 'amount', label: 'Amount', render: (r) => `₹${fmtNum(r.amount)} ${r.currency ?? ''}` },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? '—')} /> },
      { key: 'reason', label: 'Reason', render: (r) => r.reason ?? '—' },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
  reviews: {
    title: 'Reviews',
    subtitle: 'Star ratings and review comments on completed orders.',
    load: () => unwrap(getAdminReviews()),
    columns: [
      { key: 'order', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order}</span> },
      { key: 'score', label: 'Rating', render: (r) => <span className="text-sm">{"⭐".repeat(Number(r.score))}</span> },
      { key: 'comment', label: 'Comment', render: (r) => r.comment ?? '—' },
      { key: 'reviewer_phone', label: 'Reviewer', render: (r) => <span className="font-mono text-xs">{r.reviewer_phone}</span> },
      { key: 'created_at', label: 'Reviewed', render: (r) => fmtDate(r.created_at) },
    ],
  },
  ai: {
    title: 'AI predictions',
    subtitle: 'Sanitized log of price predictions, demand forecasts, and farmer/buyer matches.',
    load: () => unwrap(getAdminAiPredictions()),
    columns: [
      { key: 'prediction_type', label: 'Type', render: (r) => <StatusBadge status={String(r.prediction_type ?? '—').replace(/_/g, ' ')} /> },
      { key: 'crop', label: 'Crop', render: (r) => r.crop ?? '—' },
      { key: 'location', label: 'Location', render: (r) => r.location ?? '—' },
      { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    ],
  },
}

export default function AdminBrowsePage() {
  const { section = 'users' } = useParams<{ section: string }>()
  const config = SECTIONS[section] ?? SECTIONS.users
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    config
      .load()
      .then((res) => {
        if (!cancelled) setRows(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([])
          setError(apiErrorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [section, config])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <PageContainer>
      <AdminTable title={config.title} subtitle={config.subtitle} columns={config.columns} rows={rows} loading={loading} error={error} />
    </PageContainer>
  )
}