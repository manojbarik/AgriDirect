import { ORDER_STATUS_BADGE_TONE } from '../api/orders'
import { StatusBadge } from './ui/StatusBadge'

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={ORDER_STATUS_BADGE_TONE[status] ?? 'neutral'} />
}