import type { ReactNode } from 'react'

export interface AdminColumn<T extends Record<string, unknown>> {
  key: keyof T & string
  label: string
  render?: (row: T) => ReactNode
  className?: string
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'PUBLISHED' || status === 'COMPLETED' || status === 'PAID' || status === 'VERIFIED'
      ? 'bg-[#e7f3ee] text-[#1b6f58] border-[#cfe7dc]'
      : status === 'PENDING' || status === 'OPEN' || status === 'IN_TRANSIT' || status === 'QUALITY_CHECK'
        ? 'bg-[#fff3df] text-[#9b501e] border-[#f0d9b8]'
        : status === 'REJECTED' || status === 'FAILED' || status === 'DISPUTED' || status === 'CANCELLED'
          ? 'bg-[#fdecec] text-[#b3261e] border-[#f0c2c0]'
          : 'bg-[#f1f4ef] text-[#37474f] border-[#e0e6db]'
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

interface AdminTableProps<T extends Record<string, unknown>> {
  title: string
  subtitle?: string
  columns: AdminColumn<T>[]
  rows: T[]
  loading: boolean
  error: string | null
  empty?: ReactNode
}

export default function AdminTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  rows,
  loading,
  error,
  empty,
}: AdminTableProps<T>) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-sm">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-lg font-extrabold text-[var(--text-bright)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {error ? (
        <p className="px-5 py-6 text-sm font-semibold text-rose-600">{error}</p>
      ) : loading ? (
        <p className="px-5 py-6 text-sm font-semibold text-[var(--text-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[0.7rem] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                    {empty ?? 'No records yet.'}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-white/[0.03]">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-2.5 align-top text-[var(--text-main)] ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}