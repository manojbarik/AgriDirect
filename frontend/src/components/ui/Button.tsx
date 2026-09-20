import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold font-sans transition-all duration-150 ease-out
      rounded-xl cursor-pointer select-none
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:scale-[0.98]
    `;

    const variantStyles = {
      primary: `
        bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white
        shadow-sm shadow-emerald-900/20 hover:shadow-md hover:shadow-emerald-900/30
        border border-emerald-500/30
      `,
      secondary: `
        bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold
        shadow-sm border border-amber-400/40
      `,
      outline: `
        bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200
        border border-slate-300 dark:border-slate-700 shadow-sm
      `,
      ghost: `
        bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300
      `,
      destructive: `
        bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white
        shadow-sm border border-rose-500/30
      `,
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
      md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
      lg: 'px-5 py-3 text-base gap-2.5 rounded-xl',
      xl: 'px-6 py-3.5 text-lg gap-3 rounded-2xl',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], widthStyles, className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading…</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';