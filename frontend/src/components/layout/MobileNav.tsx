import React from 'react';
import { clsx } from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';

const mobileNavItems = [
  { path: '/marketplace', label: 'Marketplace', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm1 10a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2zM9 17H6a1 1 0 000 2h3a1 1 0 000-2zm11-2H5a1 1 0 000 2h2v3a2 2 0 002 2h6a2 2 0 002-2v-3h2a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  )},
  { path: '/farmers', label: 'Farmers', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.414V6z" clipRule="evenodd" />
    </svg>
  )},
  { path: '/orders', label: 'Orders', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2.586l1.293-1.293a1 1 0 00-.707-1.707L8 2H3zM15 18H3v-1h12v1zm0-3H3V8h1.172l.828-.828A1 1 0 015 7.172V4h10v10a1 1 0 01-1 1h-4z" clipRule="evenodd" />
    </svg>
  )},
  { path: '/assistant', label: 'Assistant', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M14.06 4.06a1 1 0 011.414 0l2.829 2.829a1 1 0 010 1.414l-2.829 2.829a1 1 0 01-1.414-1.414L17.586 10H10a1 1 0 010-2h7.586l-1.293-1.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414L13.414 6H6a1 1 0 010-2h7.586l-1.293-1.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414L6.414 6H4a1 1 0 010-2h2.414l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )},
];

const farmerMobileNavItems = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )},
  { path: '/farmer/listings', label: 'Harvests', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm1 10a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2zM9 17H6a1 1 0 000 2h3a1 1 0 000-2zm11-2H5a1 1 0 000 2h2v3a2 2 0 002 2h6a2 2 0 002-2v-3h2a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  )},
  { path: '/orders', label: 'Orders', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2.586l1.293-1.293a1 1 0 00-.707-1.707L8 2H3zM15 18H3v-1h12v1zm0-3H3V8h1.172l.828-.828A1 1 0 015 7.172V4h10v10a1 1 0 01-1 1h-4z" clipRule="evenodd" />
    </svg>
  )},
  { path: '/farmer/assistant', label: 'Assistant', icon: (
    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M14.06 4.06a1 1 0 011.414 0l2.829 2.829a1 1 0 010 1.414l-2.829 2.829a1 1 0 01-1.414-1.414L17.586 10H10a1 1 0 010-2h7.586l-1.293-1.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414L13.414 6H6a1 1 0 010-2h7.586l-1.293-1.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414L6.414 6H4a1 1 0 010-2h2.414l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )},
];

export interface MobileNavProps {
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ className }) => {
  const location = useLocation();
  const isFarmer = location.pathname.startsWith('/farmer');
  const navItems = isFarmer ? farmerMobileNavItems : mobileNavItems;

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 lg:hidden',
        className
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150',
              isActive
                ? 'text-primary-600 bg-primary-50'
                : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
            )}
            aria-label={item.label}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};