import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import LoginPage from '../src/pages/LoginPage'
import { createMock } from './test-utils'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<div>ACCOUNT_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('shows a validation error for an invalid email', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByPlaceholderText('you@example.com or +91...'), 'not-an-email')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /Sign in/ }))
    expect(await screen.findByText(/valid email address/)).toBeInTheDocument()
  })

  it('submits credentials and navigates to /account on success', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock
      .onPost('/auth/login')
      .reply(200, {
        user_id: 'u1',
        role: 'FARMER',
        status: 'ACTIVE',
        tokens: {
          access_token: 'at',
          refresh_token: 'rt',
          token_type: 'bearer',
          expires_in: 3600,
        },
      })
    mock.onGet('/auth/me').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer at')
      return [200, { id: 'u1', phone_e164: '+919850012345', role: 'FARMER', status: 'ACTIVE' }]
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('you@example.com or +91...'), 'farmer@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /Sign in/ }))

    await waitFor(() => {
      expect(mock.history.post[0].data).toContain('"email":"farmer@example.com"')
    })
    expect(await screen.findByText('ACCOUNT_PAGE')).toBeInTheDocument()
    mock.restore()
  })

  it('surfaces a backend error message on failed login', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/login').reply(401, { detail: 'Invalid credentials' })

    renderLogin()
    await user.type(screen.getByPlaceholderText('you@example.com or +91...'), 'farmer@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /Sign in/ }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    mock.restore()
  })
})