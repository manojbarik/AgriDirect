import React from 'react';
import { clsx } from 'clsx';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: ButtonProps & { label: string };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={clsx('flex flex-col items-center text-center py-12 px-6', className)}>
    {icon && (
      <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--color-neutral-100)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
    {description && (
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm">{description}</p>
    )}
    {action && (
      <Button
        className="mt-6"
        variant={action.variant || 'primary'}
        size={action.size || 'md'}
        onClick={action.onClick}
        disabled={action.disabled}
        isLoading={action.isLoading}
        leftIcon={action.leftIcon}
        rightIcon={action.rightIcon}
        fullWidth={action.fullWidth}
      >
        {action.label}
      </Button>
    )}
  </div>
);