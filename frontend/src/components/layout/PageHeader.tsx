import React from 'react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Dropdown, DropdownItem } from '../ui/Dropdown';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
  avatar?: { name: string; src?: string; onClick?: () => void };
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  avatar,
  className,
}) => {
  const userMenuItems: DropdownItem[] = [
    { label: 'Profile', onClick: () => {}, icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
    )},
    { label: 'Settings', onClick: () => {}, icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
    )},
    { divider: true },
    { label: 'Sign out', onClick: () => {}, danger: true, icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/></svg>
    )},
  ];

  return (
    <header
      className={clsx(
        'relative z-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-6 py-4',
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {crumb.path ? (
                  <a href={crumb.path} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[var(--text-primary)] font-medium">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {actions && <div className="flex items-center gap-3">{actions}</div>}
          
          {avatar && (
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" leftIcon={<Avatar name={avatar.name} size="sm" src={avatar.src} />} onClick={avatar.onClick}>
                  {avatar.name}
                </Button>
              }
              items={userMenuItems}
              align="right"
            />
          )}
        </div>
      </div>
    </header>
  );
};

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => (
  <div className={clsx('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
    </div>
    {action && <div className="w-full sm:w-auto">{action}</div>}
  </div>
);