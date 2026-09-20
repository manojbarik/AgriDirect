import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, lines = 1, className, ...props }, ref) => {
    const baseStyles = 'skeleton';

    if (variant === 'circular') {
      return (
        <div
          ref={ref}
          className={clsx(baseStyles, 'rounded-full', className)}
          style={{ width, height, minWidth: width, minHeight: height }}
          {...props}
        />
      );
    }

    if (variant === 'rectangular') {
      return (
        <div
          ref={ref}
          className={clsx(baseStyles, 'rounded-lg', className)}
          style={{ width, height, minWidth: width, minHeight: height }}
          {...props}
        />
      );
    }

    if (variant === 'card') {
      return (
        <div ref={ref} className={clsx('space-y-4', className)} {...props}>
          <div className={clsx(baseStyles, 'h-6 w-3/4 rounded-md')} />
          <div className={clsx(baseStyles, 'h-4 w-full rounded-md')} />
          <div className={clsx(baseStyles, 'h-4 w-5/6 rounded-md')} />
          <div className={clsx(baseStyles, 'h-4 w-2/3 rounded-md')} />
        </div>
      );
    }

    // text variant with multiple lines
    return (
      <div ref={ref} className={clsx('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              baseStyles,
              'h-4 rounded-md',
              i === lines - 1 && 'w-3/4'
            )}
            style={{ width: i === lines - 1 ? width : undefined }}
          />
        ))}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';