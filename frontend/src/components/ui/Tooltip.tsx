import React from 'react';
import { clsx } from 'clsx';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position,
  side,
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement = position ?? side ?? 'top';

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsVisible(false);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideTooltip();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--color-neutral-900)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--color-neutral-900)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--color-neutral-900)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--color-neutral-900)]',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={clsx(
            'absolute z-[700] px-3 py-1.5 text-xs font-medium text-[var(--text-on-primary)] bg-[var(--color-neutral-900)] rounded-lg',
            'whitespace-nowrap tooltip-enter pointer-events-none',
            positionStyles[placement]
          )}
          role="tooltip"
        >
          {content}
          <div
            className={clsx(
              'absolute w-0 h-0 border-4 border-transparent',
              arrowStyles[placement]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};