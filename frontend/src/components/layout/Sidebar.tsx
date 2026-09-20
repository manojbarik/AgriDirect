import React from 'react';
import { clsx } from 'clsx';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/useAuth';

export interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  ),
  farm: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.5 3A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0015.5 3h-11zM5 7a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V7zm2 3V7h6v3a1 1 0 01-1 1H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  crops: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm1 10a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2zM9 17H6a1 1 0 000 2h3a1 1 0 000-2zm11-2H5a1 1 0 000 2h2v3a2 2 0 002 2h6a2 2 0 002-2v-3h2a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  ),
  harvest: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  batches: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13 7H7v6h6V7z" />
      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h1a2 2 0 012 2v1h1a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h1V5a2 2 0 012-2h1V2zM3 8h14v9H3V8z" clipRule="evenodd" />
    </svg>
  ),
  weather: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-2-3.465l.465-.465a1 1 0 111.415 1.414L14 7.069A4.025 4.025 0 0114 10zM5 10a5 5 0 1110 0H5z" clipRule="evenodd" />
    </svg>
  ),
  products: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M8 2a2 2 0 00-2 2v1H4a1 1 0 000 2h.528L5.15 16.13A2 2 0 007.14 18h5.72a2 2 0 001.99-1.87L15.472 7H16a1 1 0 100-2h-2V4a2 2 0 00-2-2H8zM10 4h2v1h-2V4z" />
    </svg>
  ),
  inventory: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 3a1 1 0 000 2h5v4a1 1 0 102 0V5h5a1 1 0 100-2H5zM4 12a1 1 0 011-1h2a1 1 0 110 2H5a1 1 0 01-1-1zm6 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-7 0a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm8-3a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  ),
  orders: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2.586l1.293-1.293a1 1 0 00-.707-1.707L8 2H3zM15 18H3v-1h12v1zm0-3H3V8h1.172l.828-.828A1 1 0 015 7.172V4h10v10a1 1 0 01-1 1h-4z" clipRule="evenodd" />
    </svg>
  ),
  assistant: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 12a3 3 0 100-6 3 3 0 000 6z" />
      <path fillRule="evenodd" d="M9.4 2.5a.75.75 0 011.2 0l.7.9.9-.3a.75.75 0 01.9.9l-.3.9.9.7a.75.75 0 010 1.2l-.9.7v1.09A7.001 7.001 0 0117 15H3a7 7 0 014-6.1V7.9l-.9-.7a.75.75 0 010-1.2l.9-.7.3-.9a.75.75 0 01.9-.9l.9.3.9-.9z" clipRule="evenodd" />
    </svg>
  ),
  demand: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 6a2 2 0 012-2h.286A2 2 0 017.072 5h5.856a2 2 0 011.786 1l.942 1.885A2 2 0 0117 9.23V11a2 2 0 01-2 2h-.17a3 3 0 11-5.66 0H8.83a3 3 0 11-5.66 0H5V6z" clipRule="evenodd" />
    </svg>
  ),
  profile: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  ),
  shop: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-1 .9l-.6 9A2 2 0 005.4 19h9.2a2 2 0 002-2.1l-.6-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" />
    </svg>
  ),
  farmers: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5H5a7 7 0 011-6.906A6.97 6.97 0 006 11z" />
    </svg>
  ),
  community: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13 7H7v6h6V7z" />
      <path d="M10 4a1.75 1.75 0 110 3.5A1.75 1.75 0 0110 4z" />
      <path fillRule="evenodd" d="M10 1a9 9 0 100 18 9 9 0 000-18zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" clipRule="evenodd" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5H5a7 7 0 011-6.906A6.97 6.97 0 006 11z" />
    </svg>
  ),
  verifications: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  disputes: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-6a1 1 0 000 2 5 5 0 014.546 2.916A1 1 0 1015.8 8.6 7 7 0 0010 4zm0 0a7 7 0 100 14 7 7 0 000-14zm1 7a1 1 0 10-2 0 4 4 0 01-4 4 1 1 0 100 2 6 6 0 006-6z" clipRule="evenodd" />
    </svg>
  ),
  trust: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 1.944l.61 1.22 1.5.218 1.086 1.058 1.5.218.383 1.621 1.5.218 1.086 1.058.61 1.22-1.086 1.058 1.086 1.058.61 1.22-1.086 1.058-1.086 1.058-.383 1.621-1.5.218-1.5.218-.61 1.22-.61-1.22-1.5-.218-1.086-1.058-1.5-.218-.383-1.621-1.5-.218-1.086-1.058-.61-1.22 1.086-1.058-1.086-1.058-.61-1.22 1.086-1.058 1.086-1.058.383-1.621 1.5-.218 1.5-.218.61-1.22zM8 12.235l3.32-3.32a1 1 0 011.415 1.415L9 14.207a1 1 0 01-1.414 0L5.5 12.028a1 1 0 011.414-1.414L8 12.235zm0 0v-1.3" clipRule="evenodd" />
    </svg>
  ),
  reports: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6H11a2 2 0 00-2-2 2 2 0 00-2 2v3.586A2 2 0 006 12H4v2h12v-2h-2v-2a2 2 0 00-2-2H6z" clipRule="evenodd" />
    </svg>
  ),
  analytics: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  trips: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm5 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  notifications: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 003 13h14a1 1 0 00.707-1.707L17 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  ),
};

const WORKSPACES: Record<string, NavGroup[]> = {
  FARMER: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', path: '/farmer/dashboard', icon: 'dashboard' }],
    },
    {
      label: 'My Farm',
      items: [
        { label: 'Farm Details', path: '/farmer/farm', icon: 'farm' },
        { label: 'My Crops', path: '/farmer/listings', icon: 'crops' },
        { label: 'Add Harvest', path: '/farmer/harvests/new', icon: 'harvest' },
        { label: 'Batches', path: '/farmer/batches', icon: 'batches' },
        { label: 'Weather', path: '/farmer/weather', icon: 'weather' },
      ],
    },
    {
      label: 'Products',
      items: [
        { label: 'My Products', path: '/farmer/products', icon: 'products' },
        { label: 'Inventory', path: '/farmer/inventory', icon: 'inventory' },
      ],
    },
    {
      label: 'Orders',
      items: [{ label: 'My Orders', path: '/orders', icon: 'orders' }],
    },
    {
      label: 'AI Insights',
      items: [
        { label: 'AI Assistant', path: '/farmer/assistant', icon: 'assistant' },
        { label: 'Demand Forecast', path: '/farmer/recommendations', icon: 'demand' },
      ],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', path: '/account', icon: 'profile' }],
    },
  ],
  BUYER: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', path: '/buyer/dashboard', icon: 'dashboard' }],
    },
    {
      label: 'Marketplace',
      items: [
        { label: 'My Demands', path: '/buyer/demands', icon: 'demand' },
        { label: 'Demand Forecast', path: '/buyer/recommendations', icon: 'analytics' },
      ],
    },
    {
      label: 'Orders',
      items: [{ label: 'My Orders', path: '/orders', icon: 'orders' }],
    },
    {
      label: 'AI Insights',
      items: [{ label: 'AI Assistant', path: '/assistant', icon: 'assistant' }],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', path: '/account', icon: 'profile' }],
    },
  ],
  CONSUMER: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', path: '/consumer/dashboard', icon: 'dashboard' }],
    },
    {
      label: 'Marketplace',
      items: [
        { label: 'Shop', path: '/marketplace', icon: 'shop' },
        { label: 'Nearby Farmers', path: '/farmers', icon: 'farmers' },
      ],
    },
    {
      label: 'Orders',
      items: [{ label: 'My Orders', path: '/orders', icon: 'orders' }],
    },
    {
      label: 'Community',
      items: [{ label: 'Community', path: '/consumer/community', icon: 'community' }],
    },
    {
      label: 'Weather',
      items: [{ label: 'Weather', path: '/consumer/weather', icon: 'weather' }],
    },
    {
      label: 'AI Insights',
      items: [{ label: 'AI Assistant', path: '/assistant', icon: 'assistant' }],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', path: '/account', icon: 'profile' }],
    },
  ],
  ADMIN: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', path: '/admin', icon: 'dashboard' }],
    },
    {
      label: 'People',
      items: [
        { label: 'Users', path: '/admin/users', icon: 'users' },
        { label: 'Farmers', path: '/admin/farmers', icon: 'farmers' },
      ],
    },
    {
      label: 'Marketplace',
      items: [
        { label: 'Products', path: '/admin/products', icon: 'products' },
        { label: 'Orders', path: '/admin/orders', icon: 'orders' },
        { label: 'Verifications', path: '/admin/verifications', icon: 'verifications' },
      ],
    },
    {
      label: 'Trust & Safety',
      items: [
        { label: 'Disputes', path: '/admin/disputes', icon: 'disputes' },
        { label: 'Trust Scores', path: '/admin/trust-scores', icon: 'trust' },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'Reports', path: '/admin/reports', icon: 'reports' },
        { label: 'Analytics', path: '/admin/analytics', icon: 'analytics' },
      ],
    },
  ],
  LOGISTICS: [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', path: '/logistics/dashboard', icon: 'dashboard' }],
    },
    {
      label: 'Trips',
      items: [{ label: 'Assigned Trips', path: '/logistics/dashboard', icon: 'trips' }],
    },
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({ className, collapsed = false, onToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const displayName = user?.email ?? user?.phone_e164 ?? 'Guest';

  const roleGroups = React.useMemo(() => {
    if (user?.role && WORKSPACES[user.role]) return WORKSPACES[user.role];
    if (location.pathname.startsWith('/farmer')) return WORKSPACES.FARMER;
    if (location.pathname.startsWith('/buyer')) return WORKSPACES.BUYER;
    if (location.pathname.startsWith('/admin')) return WORKSPACES.ADMIN;
    if (location.pathname.startsWith('/logistics')) return WORKSPACES.LOGISTICS;
    if (location.pathname.startsWith('/consumer')) return WORKSPACES.CONSUMER;
    return WORKSPACES.CONSUMER;
  }, [user?.role, location.pathname]);

  return (
    <aside
      className={clsx(
        'fixed lg:flex flex-col h-full bg-white border-r border-neutral-200 transition-all duration-300 ease-out z-40',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
      aria-label="Sidebar navigation"
    >
      <div className={clsx('flex items-center justify-between h-16 px-4 border-b border-neutral-200', collapsed && 'justify-center')}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-700" aria-label="AgriDirect Home">
            <svg className="h-8 w-8 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L4 10v12l12 8 12-8V10L16 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M16 10v12M8 14l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>AgriDirect</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="flex items-center justify-center" aria-label="AgriDirect Home">
            <svg className="h-8 w-8 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L4 10v12l12 8 12-8V10L16 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M16 10v12M8 14l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {!collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Collapse sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M11.78 14.78a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L8.414 9H17a1 1 0 100-2H8.414l3.364-3.364a1 1 0 01-1.414-1.414l-4 4a1 1 0 010 1.414l4 4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto" aria-label="Main navigation">
        {roleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      collapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                    )
                  }
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 h-5 w-5 text-current">{ICONS[item.icon]}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} size="md" status="online" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{displayName}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.role?.replaceAll('_', ' ') ?? 'Guest'}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};