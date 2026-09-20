import type { HTMLAttributes } from 'react'
import { cn } from '../api/utils'

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  narrow?: boolean
}

export function PageContainer({ narrow = false, className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 pb-28 md:pb-12 space-y-6',
        narrow && 'max-w-3xl',
        className,
      )}
      {...props}
    />
  )
}