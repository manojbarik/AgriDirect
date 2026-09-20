import { Star } from 'lucide-react'
import { TRUST_BAND_BADGE_TONE, TRUST_BAND_LABELS } from '../api/trust'

interface TrustBadgeProps {
  score: number | string
  band?: string | null
  size?: 'sm' | 'md'
}

export function TrustBadge({ score, band, size = 'sm' }: TrustBadgeProps) {
  const value = Number(score)
  const bandKey = band ?? (value >= 75 ? 'HIGH' : value >= 50 ? 'MEDIUM' : 'LOW')
  const tone = TRUST_BAND_BADGE_TONE[bandKey] ?? 'neutral'
  const label = TRUST_BAND_LABELS[bandKey] ?? bandKey
  return (
    <span
      className={`status-badge status-badge-${tone} ${size === 'md' ? 'px-3 py-1 text-xs' : ''}`}
      title={`Trust score ${value}/100 · ${label}`}
    >
      <Star className={`${size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-amber-500`} />
      <span>{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  )
}