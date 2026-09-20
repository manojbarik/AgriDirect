import React from 'react';
import { clsx } from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, Store, LayoutDashboard, Package, Bot, Bell, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { useAuth } from '../../contexts/useAuth';
import { getUnreadNotificationCount } from '../../api/notifications';
import { useTheme } from '../../contexts/ThemeContext';

export interface NavbarProps {
  className?: string;
  onOpenAiAssistant?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ className, onOpenAiAssistant }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUnreadNotificationCount()
      .then((res) => {
        if (!cancelled) setUnreadCount(res.data.unread_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/marketplace', label: 'Marketplace', icon: Store },
    { path: '/prices', label: 'Price Intelligence' },
    { path: '/logistics', label: 'Live Tracking' },
    { path: '/contracts', label: 'Contracts' },
    { path: '/farmers', label: 'Farmers Directory' },
  ];

  const userMenuItems: DropdownItem[] = [
    {
      label: 'Dashboard',
      onClick: () => {
        if (!user) return;
        const path = user.role === 'FARMER' ? '/farmer/dashboard' : user.role === 'BUYER' ? '/buyer/dashboard' : '/admin';
        window.location.href = path;
      },
      icon: <LayoutDashboard className="w-4 h-4 text-emerald-500" />,
    },
    {
      label: 'My Orders',
      onClick: () => {
        window.location.href = '/orders';
      },
      icon: <Package className="w-4 h-4 text-slate-400" />,
    },
    { divider: true },
    {
      label: 'Sign out',
      onClick: logout,
      danger: true,
      icon: <LogOut className="w-4 h-4 text-rose-500" />,
    },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 w-full backdrop-blur-xl transition-colors duration-200 font-sans',
        'bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800 shadow-xs',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="AgriDirect Home">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/20 border border-emerald-400/30 group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Agri<span className="text-emerald-600 dark:text-emerald-400">Direct</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Direct Agri
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Smart Farmer-Buyer Ecosystem
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                    active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* AI Assistant Button */}
            {onOpenAiAssistant && (
              <button
                onClick={onOpenAiAssistant}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
              >
                <Bot className="w-4 h-4 text-amber-500" />
                <span>Ask AI</span>
              </button>
            )}

            {/* User Auth or Sign-In CTAs */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </Link>

                <Dropdown
                  trigger={
                    <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Avatar name={user.email || user.phone_e164} size="sm" />
                    </button>
                  }
                  items={userMenuItems}
                  align="right"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-900/20 transition-all hover:scale-[1.02]"
                >
                  Join Free
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-5 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
          {!user && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <Link
                to="/login"
                className="flex-1 text-center py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm"
              >
                Join Free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};