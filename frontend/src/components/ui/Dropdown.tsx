import React, { Fragment, useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';

export interface DropdownItem {
  label?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactElement;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: number;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right', width }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const renderTrigger = () => {
    if (!React.isValidElement(trigger)) return trigger;

    const triggerProps = (trigger as React.ReactElement<Record<string, unknown>>).props as Record<string, unknown> & {
      onClick?: (e: React.MouseEvent) => void;
    };

    return React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
        triggerProps.onClick?.(e);
      },
      'aria-haspopup': 'true',
      'aria-expanded': isOpen,
    });
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={clsx(
        'absolute top-full mt-1.5 z-[100] min-w-[180px] bg-[var(--surface-card)] rounded-xl shadow-lg border border-[var(--border-subtle)]',
        'dropdown-enter overflow-hidden',
        align === 'right' ? 'right-0' : 'left-0'
      )}
      style={{ width: width ? `${width}px` : undefined }}
      role="menu"
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className="h-px bg-[var(--border-subtle)] my-1" role="separator" />;
        }

        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                setIsOpen(false);
              }
            }}
            disabled={item.disabled}
            className={clsx(
              'w-full px-3 py-2 text-left flex items-center gap-3 text-sm transition-colors',
              item.danger
                ? 'text-[var(--color-error)] hover:bg-[var(--color-error-light)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]',
              item.disabled && 'opacity-50 cursor-not-allowed',
              'focus-visible:bg-[var(--surface-active)]'
            )}
            role="menuitem"
            tabIndex={-1}
          >
            {item.icon && <span className="flex-shrink-0 h-5 w-5">{item.icon}</span>}
            {item.label && <span className="flex-1">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <Fragment>
      {renderTrigger()}
      {isOpen && createPortal(dropdownContent, document.body)}
    </Fragment>
  );
};

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  options: SelectOption[];
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, placeholder, options, fullWidth = true, className, id, ...props }, ref) => {
    const useId = React.useId();
    const selectId = id || useId;

    return (
      <div className={clsx('w-full', fullWidth && 'max-w-full')}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full rounded-xl border bg-[var(--surface-input)] text-[var(--text-primary)]',
              'transition-all ease-out',
              'input-focus appearance-none',
              'pl-4 pr-10 py-2.5 text-base',
              error
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-strong)] focus:border-[var(--border-focus)]',
              'disabled:bg-[var(--surface-disabled)] disabled:text-[var(--text-disabled)] disabled:border-[var(--border-subtle)]',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--text-tertiary)]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-[var(--color-error)] flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-[var(--text-tertiary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';