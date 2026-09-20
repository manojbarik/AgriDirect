import { describe, expect, it } from 'vitest'
import {
  roleThemeClassName,
  roleToTheme,
  type RoleTheme,
} from '../src/hooks/useRoleTheme'
import { ROLES, ROLE_LABELS, type Role } from '../src/api/auth'

describe('roleTheme', () => {
  it('maps every role to one of the three theme palettes', () => {
    const themes = ROLES.map((role) => roleToTheme(role))
    for (const theme of themes) {
      expect(['farmer', 'consumer', 'admin'] as RoleTheme[]).toContain(theme)
    }
  })

  it('groups farmer and logistics under the farmer palette', () => {
    expect(roleToTheme('FARMER')).toBe('farmer')
    expect(roleToTheme('LOGISTICS')).toBe('farmer')
  })

  it('groups buyer and consumer under the consumer palette', () => {
    expect(roleToTheme('BUYER')).toBe('consumer')
    expect(roleToTheme('CONSUMER')).toBe('consumer')
  })

  it('maps admin and unknown roles to the admin palette', () => {
    expect(roleToTheme('ADMIN')).toBe('admin')
    expect(roleToTheme(null)).toBe('admin')
    expect(roleToTheme(undefined)).toBe('admin')
  })

  it('builds a role- prefixed body class name', () => {
    expect(roleThemeClassName('farmer')).toBe('role-farmer')
    expect(roleThemeClassName('consumer')).toBe('role-consumer')
    expect(roleThemeClassName('admin')).toBe('role-admin')
  })
})

describe('role registry', () => {
  it('covers every role in labels', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(
      ['FARMER', 'BUYER', 'ADMIN', 'CONSUMER', 'LOGISTICS', 'BULK_BUYER'].sort(),
    )
  })

  it('labels each role with a human-readable name', () => {
    for (const role of ROLES) {
      expect(typeof ROLE_LABELS[role as Role] === 'string').toBe(true)
    }
  })
})