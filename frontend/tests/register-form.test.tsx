import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import RegisterPage from '../src/pages/RegisterPage'
import { createMock } from './test-utils'

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<div>VERIFY_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  it('validates the phone before calling the API', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    renderRegister()
    await user.type(screen.getByPlaceholderText('+91 98500 12345'), 'not-a-phone')
    await user.click(screen.getByRole('button', { name: /Create Account/i }))
    expect(await screen.findByText(/Enter your phone number/)).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
    mock.restore()
  })

  it('registers with the selected role and navigates to /verify', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/register').reply(200, {
      user_id: 'u1',
      challenge_id: 'ch1',
      purpose: 'REGISTER',
      expires_at: '2026-09-07T00:00:00Z',
      resend_after_seconds: 60,
      mock_code: '1234',
      phone_e164: '+919850012345',
      role: 'BUYER',
      status: 'PENDING',
    })

    renderRegister()
    await user.click(screen.getByRole('button', { name: /🛒 Buyer/ }))
    await user.type(screen.getByPlaceholderText('+91 98500 12345'), '+91 98500 12345')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'buyer@example.com')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1)
    })
    const payload = JSON.parse(mock.history.post[0].data)
    expect(payload.role).toBe('BUYER')
    expect(payload.phone_e164).toBe('+919850012345')
    expect(payload.email).toBe('buyer@example.com')
    expect(await screen.findByText('VERIFY_PAGE')).toBeInTheDocument()
    mock.restore()
  })

  it('shows an error when the phone is already registered', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/register').reply(409, {
      detail: 'An account with this phone already exists',
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('+91 98500 12345'), '+91 98500 12345')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'buyer@example.com')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /Create Account/i }))

    expect(
      await screen.findByText('An account with this phone already exists'),
    ).toBeInTheDocument()
    mock.restore()
  })
})