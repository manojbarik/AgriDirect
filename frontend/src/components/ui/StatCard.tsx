import React from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

const SEMANTIC = {
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  info: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  iconBg = SEMANTIC.success,
  trend = 'neutral',
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-sm animate-pulse">
        <div className="h-3.5 w-1/2 bg-[var(--color-neutral-200)] rounded" />
        <div className="mt-3 h-7 w-2/3 bg-[var(--color-neutral-200)] rounded" />
        {change && <div className="mt-2 h-3.5 w-1/3 bg-[var(--color-neutral-200)] rounded" />}
      </div>
    );
  }

  const trendColors = {
    up: 'text-[var(--color-success)] bg-[var(--color-success-light)] border-[var(--color-success-border)]',
    down: 'text-[var(--color-error)] bg-[var(--color-error-light)] border-[var(--color-error-border)]',
    neutral: 'text-[var(--text-tertiary)] bg-[var(--color-neutral-100)] border-[var(--color-neutral-200)]',
  };

  const trendIcons = {
    up: (
      <svg className="h-3 w-3 inline mr-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V17a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ),
    down: (
      <svg className="h-3 w-3 inline mr-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586V3a1 1 0 112 0v9.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <div className="min-w-0 p-6 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-sans">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-sans tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className={clsx('p-2.5 rounded-xl border border-[var(--border-subtle)] flex-shrink-0', iconBg)}>
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs font-sans min-w-0">
          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] border whitespace-nowrap', trendColors[trend])}>
            {trendIcons[trend]}
            {change.value > 0 ? '+' : ''}{change.value}%
          </span>
          <span className="truncate text-[var(--text-tertiary)]">{change.label}</span>
        </div>
      )}
    </div>
  );
};