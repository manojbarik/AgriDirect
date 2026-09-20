import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const SEMANTIC_BG = {
  default: 'var(--color-neutral-100)',
  primary: 'var(--color-primary-50)',
  success: 'var(--color-success-light)',
  warning: 'var(--color-warning-light)',
  error: 'var(--color-error-light)',
  info: 'var(--color-info-light)',
  outline: 'transparent',
} as const;

const SEMANTIC_TEXT = {
  default: 'var(--text-secondary)',
  primary: 'var(--color-primary-700)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  outline: 'var(--text-secondary)',
} as const;

const SEMANTIC_BORDER = {
  default: 'var(--border-subtle)',
  primary: 'var(--color-primary-200)',
  success: 'var(--color-success-border)',
  warning: 'var(--color-warning-border)',
  error: 'var(--color-error-border)',
  info: 'var(--color-info-border)',
  outline: 'var(--border-default)',
} as const;

const SEMANTIC_DOT = {
  default: 'var(--text-tertiary)',
  primary: 'var(--color-primary-600)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  outline: 'var(--text-tertiary)',
} as const;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', dot = false, className, ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[10px] tracking-wide gap-1 uppercase font-bold',
      md: 'px-2.5 py-0.5 text-xs tracking-wide gap-1.5 uppercase font-bold',
      lg: 'px-3 py-1 text-sm tracking-wide gap-2 uppercase font-bold',
    };

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center rounded-full border shadow-sm font-sans',
          '[background-color:var(--badge-bg)] [color:var(--badge-text)] [border-color:var(--badge-border)]',
          sizeStyles[size],
          className
        )}
        style={
          {
            '--badge-bg': SEMANTIC_BG[variant],
            '--badge-text': SEMANTIC_TEXT[variant],
            '--badge-border': SEMANTIC_BORDER[variant],
          } as React.CSSProperties
        }
        {...props}
      >
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: SEMANTIC_DOT[variant] }}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';