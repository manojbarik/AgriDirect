export function fmtDate(value: unknown): string {
  if (!value) return '—'
  return new Date(String(value)).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtNum(value: unknown, digits = 2): string {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: digits,
  })
}
