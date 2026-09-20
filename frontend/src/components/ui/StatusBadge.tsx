import { Badge } from './Badge'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'

type StatusBadgeProps = {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const variant: BadgeVariant =
    tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'error' : 'default'
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  )
}