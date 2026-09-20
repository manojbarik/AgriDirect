import {
  Bell,
  CloudSun,
  Home,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  NotebookPen,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Truck,
  User,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from './auth'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  children?: NavItem[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export interface RoleNavigation {
  role: Role
  brandLabel: string
  sections: NavSection[]
  mobile: NavItem[]
}

const ACCOUNT_ITEMS: NavItem[] = [
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Profile & Settings', to: '/account', icon: User },
]

export const ROLE_NAVIGATION: Record<Role, RoleNavigation> = {
  FARMER: {
    role: 'FARMER',
    brandLabel: 'Farmer Workspace',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', to: '/farmer/dashboard', icon: LayoutDashboard },
          { label: 'Account Overview', to: '/farmer/account', icon: User },
          { label: 'AI Insights', to: '/farmer/recommendations', icon: Sparkles },
        ],
      },
      {
        label: 'Sell & Manage',
        items: [
          {
            label: 'My Farm',
            to: '/farmer/farm',
            icon: Sprout,
            children: [
              { label: 'Farm Overview', to: '/farmer/farm', icon: Sprout },
              { label: 'Farm Notes', to: '/farmer/notes', icon: NotebookPen },
            ],
          },
          {
            label: 'Products',
            to: '/farmer/products',
            icon: Package,
            children: [
              { label: 'My Products', to: '/farmer/products', icon: Package },
              { label: 'Listings', to: '/farmer/listings', icon: Store },
              { label: 'Inventory', to: '/farmer/inventory', icon: Warehouse },
            ],
          },
          { label: 'Batches', to: '/farmer/batches', icon: PackageCheck },
        ],
      },
      {
        label: 'Operations',
        items: [
          {
            label: 'Orders',
            to: '/farmer/orders',
            icon: Receipt,
            children: [
              { label: 'Orders', to: '/farmer/orders', icon: Receipt },
              { label: 'Contracts', to: '/contracts', icon: Receipt },
            ],
          },
          { label: 'Logistics & Tracking', to: '/logistics', icon: Truck },
          { label: 'Weather', to: '/farmer/weather', icon: CloudSun },
          { label: 'Storage Intel', to: '/farmer/storage', icon: Warehouse },
        ],
      },
    ],
    mobile: [
      { label: 'Home', to: '/farmer/dashboard', icon: Home },
      { label: 'Marketplace', to: '/marketplace', icon: Store },
      { label: 'AI', to: '/farmer/recommendations', icon: Sparkles },
      { label: 'Tracking', to: '/logistics', icon: Truck },
      { label: 'Profile', to: '/account', icon: User },
    ],
  },
  BUYER: {
    role: 'BUYER',
    brandLabel: 'Buyer Workspace',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', to: '/buyer/dashboard', icon: LayoutDashboard },
          { label: 'AI Recommendations', to: '/buyer/recommendations', icon: Sparkles },
          { label: 'Logistics Tracking', to: '/logistics', icon: Truck },
        ],
      },
      {
        label: 'Sourcing',
        items: [
          { label: 'Demand Posts', to: '/buyer/demands', icon: ListChecks },
          { label: 'Orders', to: '/buyer/orders', icon: Receipt },
          { label: 'Onboarding', to: '/buyer/onboarding', icon: Settings },
        ],
      },
      {
        label: 'Marketplace',
        items: [{ label: 'Browse Listings', to: '/marketplace', icon: Store }],
      },
      { label: 'Account', items: ACCOUNT_ITEMS },
    ],
    mobile: [
      { label: 'Home', to: '/buyer/dashboard', icon: Home },
      { label: 'Demands', to: '/buyer/demands', icon: ListChecks },
      { label: 'AI', to: '/buyer/recommendations', icon: Sparkles },
      { label: 'Tracking', to: '/logistics', icon: Truck },
      { label: 'Profile', to: '/account', icon: User },
    ],
  },
  BULK_BUYER: {
    role: 'BULK_BUYER',
    brandLabel: 'Enterprise Procurement',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', to: '/bulk-buyer/dashboard', icon: LayoutDashboard },
          { label: 'AI Recommendations', to: '/buyer/recommendations', icon: Sparkles },
          { label: 'Logistics Tracking', to: '/logistics', icon: Truck },
        ],
      },
      {
        label: 'Sourcing',
        items: [
          { label: 'Demand Posts', to: '/buyer/demands', icon: ListChecks },
          { label: 'Orders', to: '/buyer/orders', icon: Receipt },
          { label: 'Onboarding', to: '/buyer/onboarding', icon: Settings },
        ],
      },
      {
        label: 'Marketplace',
        items: [{ label: 'Browse Listings', to: '/marketplace', icon: Store }],
      },
      { label: 'Account', items: ACCOUNT_ITEMS },
    ],
    mobile: [
      { label: 'Home', to: '/bulk-buyer/dashboard', icon: Home },
      { label: 'Demands', to: '/buyer/demands', icon: ListChecks },
      { label: 'Tracking', to: '/logistics', icon: Truck },
      { label: 'Orders', to: '/buyer/orders', icon: Package },
      { label: 'Profile', to: '/account', icon: User },
    ],
  },
  CONSUMER: {
    role: 'CONSUMER',
    brandLabel: 'Consumer Hub',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Home', to: '/consumer/dashboard', icon: Home },
          { label: 'Marketplace', to: '/consumer/marketplace', icon: Store },
          { label: 'Live Order Tracking', to: '/logistics', icon: Truck },
        ],
      },
      {
        label: 'Community',
        items: [
          { label: 'Weather', to: '/consumer/weather', icon: CloudSun },
          { label: 'Community', to: '/consumer/community', icon: Users },
        ],
      },
      { label: 'Account', items: ACCOUNT_ITEMS },
    ],
    mobile: [
      { label: 'Home', to: '/consumer/dashboard', icon: Home },
      { label: 'Marketplace', to: '/consumer/marketplace', icon: Store },
      { label: 'Tracking', to: '/logistics', icon: Truck },
      { label: 'Profile', to: '/consumer/profile', icon: User },
    ],
  },
  LOGISTICS: {
    role: 'LOGISTICS',
    brandLabel: 'Logistics Hub',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Live Map Tracking', to: '/logistics', icon: Truck },
          { label: 'Route Dispatch & Assign', to: '/logistics/dashboard', icon: Sparkles },
        ],
      },
      { label: 'Account', items: ACCOUNT_ITEMS },
    ],
    mobile: [
      { label: 'Live Map', to: '/logistics', icon: Truck },
      { label: 'Dispatch', to: '/logistics/dashboard', icon: Sparkles },
      { label: 'Profile', to: '/account', icon: User },
    ],
  },
  ADMIN: {
    role: 'ADMIN',
    brandLabel: 'Admin Console',
    sections: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
          { label: 'Logistics Monitor', to: '/logistics', icon: Truck },
          { label: 'Verifications', to: '/admin/verifications', icon: ShieldCheck },
          { label: 'Trust Scores', to: '/admin/trust-scores', icon: Shield },
        ],
      },
      {
        label: 'Support',
        items: [{ label: 'Disputes', to: '/admin/disputes', icon: LifeBuoy }],
      },
      {
        label: 'Data',
        items: [{ label: 'Browse Records', to: '/admin/overview', icon: Settings }],
      },
      { label: 'Account', items: ACCOUNT_ITEMS },
    ],
    mobile: [
      { label: 'Home', to: '/admin', icon: Home },
      { label: 'Verifications', to: '/admin/verifications', icon: ShieldCheck },
      { label: 'Disputes', to: '/admin/disputes', icon: LifeBuoy },
      { label: 'Profile', to: '/account', icon: User },
    ],
  },
}

export function navigationForRole(role: Role | null | undefined): RoleNavigation {
  if (role && role in ROLE_NAVIGATION) return ROLE_NAVIGATION[role]
  return ROLE_NAVIGATION.FARMER
}

export function isNavActive(to: string, pathname: string): boolean {
  if (pathname === to) return true
  return to !== '/' && pathname.startsWith(`${to}/`)
}

export interface Crumb {
  label: string
  to?: string
}

function humanizeSegment(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/[-_]/g, ' ')
}

const FALLBACK_LABELS: Record<string, string> = {
  account: 'Account',
  notifications: 'Notifications',
  contracts: 'Contracts',
  marketplace: 'Marketplace',
}

export function crumbTrail(nav: RoleNavigation, pathname: string): Crumb[] {
  for (const section of nav.sections) {
    for (const item of section.items) {
      if (isNavActive(item.to, pathname)) {
        return [{ label: section.label }, { label: item.label, to: item.to }]
      }
    }
  }

  const segments = pathname.split('/').filter(Boolean)
  const root = segments[0] ?? ''
  if (root in FALLBACK_LABELS) {
    const primary = { label: FALLBACK_LABELS[root] }
    if (segments.length > 2) {
      return [primary, { label: humanizeSegment(segments[segments.length - 1]) }]
    }
    return [primary]
  }

  if (segments.length > 0) {
    return [{ label: humanizeSegment(segments[segments.length - 1]) }]
  }
  return []
}