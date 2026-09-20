import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { PageHeader } from './PageHeader';

export interface DashboardLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
}) => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const isFarmer = location.pathname.startsWith('/farmer');

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only on desktop */}
        {!isMobile && isFarmer && (
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        )}
        
        {/* Main Content */}
        <main className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', isFarmer && !isMobile && !sidebarCollapsed ? 'lg:ml-64' : '')}>
          <PageHeader
            title={title}
            description={description}
            breadcrumbs={breadcrumbs}
            actions={actions}
          />
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};

export interface PublicLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  className?: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, showNavbar = true, className }) => {
  return (
    <div className={clsx('min-h-screen bg-neutral-50 flex flex-col', className)}>
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};