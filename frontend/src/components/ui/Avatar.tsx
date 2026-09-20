import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  variant?: 'default' | 'filled' | 'outline';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', shape = 'circle', variant = 'default', status, statusPosition = 'bottom-right', className, ...props }, ref) => {
    const sizeStyles = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-24 h-24 text-2xl',
    };

    const shapeStyles = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

    const variantStyles = {
      default: '',
      filled: 'bg-primary-600 text-white',
      outline: 'bg-white border-2 border-neutral-200',
    };

    const statusColors = {
      online: 'bg-primary-500',
      offline: 'bg-neutral-400',
      busy: 'bg-red-500',
      away: 'bg-amber-500',
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-3.5 h-3.5',
      '2xl': 'w-4 h-4',
    };

    const statusPositions = {
      'bottom-right': 'bottom-0 right-0',
      'top-right': 'top-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'top-left': 'top-0 left-0',
    };

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const bgColors = [
      'bg-primary-100 text-primary-700',
      'bg-earth-100 text-earth-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-green-100 text-green-700',
      'bg-teal-100 text-teal-700',
      'bg-cyan-100 text-cyan-700',
      'bg-sky-100 text-sky-700',
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
    ];

    const getBgColor = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return bgColors[Math.abs(hash) % bgColors.length];
    };

    return (
      <div ref={ref} className={clsx('relative inline-flex shrink-0', className)} {...props}>
        <div className={clsx(sizeStyles[size], shapeStyles, 'overflow-hidden bg-neutral-100 flex items-center justify-center')}>
          {src ? (
            <img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            <span className={clsx('font-semibold', variantStyles[variant], getBgColor(name || 'User'))}>
              {name ? getInitials(name) : '?'}
            </span>
          )}
        </div>
        {status && (
          <span
            className={clsx(
              'absolute border-2 border-white',
              statusColors[status],
              statusSizes[size],
              'rounded-full',
              statusPositions[statusPosition]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: Array<{ src?: string; name: string; alt?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  overlap?: boolean;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = 'md',
  overlap = true,
  className,
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={clsx('flex', overlap && '-space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          className={clsx('ring-2 ring-white', overlap && index > 0 && 'z-[calc(100-index)]')}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          name={`${remainingCount}+`}
          size={size}
          className={clsx('bg-neutral-100 text-neutral-600 ring-2 ring-white', overlap && 'z-0')}
        />
      )}
    </div>
  );
};

AvatarGroup.displayName = 'AvatarGroup';