import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { AuthProvider } from '../src/contexts/AuthContext'
import { apiClient } from '../src/api/api-client'
import { setTokens } from '../src/api/api-client'
import type { Role, UserResponse } from '../src/api/auth'

export const ACCESS = 'test-access-token'
export const REFRESH = 'test-refresh-token'

export function makeUser(role: Role = 'FARMER'): UserResponse {
  return {
    id: 'user-123',
    phone_e164: '+919000000001',
    email: null,
    role,
    status: 'ACTIVE',
    phone_verified_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  }
}

export function mockTokensAndUser(mock: MockAdapter, role: Role = 'FARMER') {
  setTokens(ACCESS, REFRESH)
  mock.onGet('/auth/me').reply(200, makeUser(role))
}

export function renderWithProviders(ui: ReactNode, initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )
}

export function createMock() {
  const mock = new MockAdapter(apiClient)
  return mock
}