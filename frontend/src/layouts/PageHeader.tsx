import type { ReactNode } from 'react'
import { cn } from '../api/utils'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <div
          role="heading"
          aria-level={1}
          className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-bright,var(--text-primary,#0f172a))] dark:text-white"
        >
          {title}
        </div>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-muted,var(--text-secondary,#64748b))] dark:text-neutral-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}