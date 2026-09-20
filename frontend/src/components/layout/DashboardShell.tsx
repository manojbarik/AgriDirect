import React from 'react';
import { clsx } from 'clsx';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children, className }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <>
      <Navbar />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={clsx(
          'pb-16 transition-all duration-300',
          collapsed ? 'lg:ml-16' : 'lg:ml-64',
          className
        )}
      >
        {children}
      </main>
      <MobileNav />
    </>
  );
};