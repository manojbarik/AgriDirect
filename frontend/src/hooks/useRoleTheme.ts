import { useEffect } from 'react'
import { useAuth } from '../contexts/useAuth'
import type { Role } from '../api/auth'

export type RoleTheme = 'farmer' | 'consumer' | 'admin'

export function roleToTheme(role: Role | null | undefined): RoleTheme {
  switch (role) {
    case 'FARMER':
    case 'LOGISTICS':
      return 'farmer'
    case 'BUYER':
    case 'CONSUMER':
      return 'consumer'
    case 'ADMIN':
    default:
      return 'admin'
  }
}

export function roleThemeClassName(theme: RoleTheme): string {
  return `role-${theme}`
}

export function useRoleTheme(): { roleTheme: RoleTheme } {
  const { user } = useAuth()
  const roleTheme = roleToTheme(user?.role)

  useEffect(() => {
    const previous = Array.from(document.body.classList).filter((c) =>
      c.startsWith('role-'),
    )
    previous.forEach((c) => document.body.classList.remove(c))
    document.body.classList.add(roleThemeClassName(roleTheme))
    return () => {
      document.body.classList.remove(roleThemeClassName(roleTheme))
    }
  }, [roleTheme])

  return { roleTheme }
}
