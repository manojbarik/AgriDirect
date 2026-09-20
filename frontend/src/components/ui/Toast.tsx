import React from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'default';
  title: string;
  message?: string;
  onClose: (id: string) => void;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'default',
  title,
  message,
  onClose,
  action,
  duration = 5000,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  const typeStyles = {
    success: 'bg-white border-l-4 border-primary-500',
    error: 'bg-white border-l-4 border-red-500',
    warning: 'bg-white border-l-4 border-amber-500',
    info: 'bg-white border-l-4 border-blue-500',
    default: 'bg-white border-l-4 border-neutral-500',
  };

  const iconStyles = {
    success: 'text-primary-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
    default: 'text-neutral-500',
  };

  const icons = {
    success: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10 7.293 11.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 102 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    default: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 102 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  };

  return createPortal(
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg border',
        'toast-enter',
        typeStyles[type]
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={clsx('flex-shrink-0 mt-0.5', iconStyles[type])}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-neutral-900">{title}</p>
        {message && <p className="mt-1 text-sm text-neutral-500">{message}</p>}
        {action && (
          <button
            onClick={() => { action.onClick(); onClose(id); }}
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </button>
    </div>,
    document.body
  );
};

export interface ToastInput {
  type?: ToastProps['type'];
  title: string;
  message?: string;
  action?: ToastProps['action'];
  duration?: number;
}

/* eslint-disable react-refresh/only-export-components */

export interface ToastState extends ToastInput {
  id: string;
}

export interface ToastContainerProps {
  toasts: ToastState[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose, position = 'bottom-right' }) => {
  if (toasts.length === 0) return null;

  const positionStyles = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <div
      className={clsx('fixed z-[800] flex flex-col gap-3 max-w-sm w-full', positionStyles[position])}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

export type UseToastOptions = ToastInput | string;

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const toast = React.useCallback((input: UseToastOptions) => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolved: ToastInput = typeof input === 'string' ? { title: input } : input;
    setToasts((prev) => [...prev, { ...resolved, id }]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, removeToast };
}
/* eslint-enable react-refresh/only-export-components */