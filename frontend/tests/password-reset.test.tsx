import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import ForgotPasswordPage from '../src/pages/ForgotPasswordPage'
import ResetPasswordPage from '../src/pages/ResetPasswordPage'
import { createMock } from './test-utils'

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AuthProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<div>RESET_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function renderReset(token: string | null = 'abcd1234'.repeat(8)) {
  const entries = token
    ? [`/reset-password?token=${token}`]
    : ['/reset-password']
  return render(
    <MemoryRouter initialEntries={entries}>
      <AuthProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/forgot-password" element={<div>FORGOT_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  it('validates the identifier before calling the API', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    renderForgot()
    await user.type(screen.getByLabelText(/Email or phone number/), 'x')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(mock.history.post.length).toBe(0)
    mock.restore()
  })

  it('requests a reset and reveals the demo token', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/forgot-password').reply(200, {
      message: 'If an account exists for that email or phone number, a password reset link has been sent.',
      expires_in_minutes: 30,
      mock_reset_token: 'DEMO-TOKEN-123',
    })
    renderForgot()
    await user.type(screen.getByLabelText(/Email or phone number/), 'farmer@example.test')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() => expect(mock.history.post.length).toBe(1))
    expect(JSON.parse(mock.history.post[0].data).identifier).toBe('farmer@example.test')
    expect(await screen.findByText(/reset link has been sent/)).toBeInTheDocument()
    expect(await screen.findByText(/Continue with demo reset link/)).toBeInTheDocument()
    mock.restore()
  })

  it('surfaces a backend error on failure', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/forgot-password').reply(429, { detail: 'Too many requests' })
    renderForgot()
    await user.type(screen.getByLabelText(/Email or phone number/), 'farmer@example.test')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Too many requests')).toBeInTheDocument()
    mock.restore()
  })
})

describe('ResetPasswordPage', () => {
  it('shows a missing-token notice when no token is present', async () => {
    renderReset(null)
    expect(await screen.findByText(/missing or malformed/)).toBeInTheDocument()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    renderReset()
    await user.type(screen.getByLabelText(/New password/), 'StrongPass123!')
    await user.type(screen.getByLabelText(/Confirm new password/), 'Different123!')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
    mock.restore()
  })

  it('submits the reset and shows confirmation', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/reset-password').reply(200, { message: 'Your password has been reset successfully' })
    renderReset()
    await user.type(screen.getByLabelText(/New password/), 'NewStrongPass123!')
    await user.type(screen.getByLabelText(/Confirm new password/), 'NewStrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() => expect(mock.history.post.length).toBe(1))
    const payload = JSON.parse(mock.history.post[0].data)
    expect(payload.new_password).toBe('NewStrongPass123!')
    expect(payload.token).toBeTruthy()
    expect(await screen.findByText(/Password updated/)).toBeInTheDocument()
    mock.restore()
  })

  it('shows the expired-link error when the token has expired', async () => {
    const user = userEvent.setup()
    const mock = createMock()
    mock.onPost('/auth/reset-password').reply(400, {
      detail: 'This reset link has expired. Please request a new one',
    })
    renderReset()
    await user.type(screen.getByLabelText(/New password/), 'NewStrongPass123!')
    await user.type(screen.getByLabelText(/Confirm new password/), 'NewStrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText(/expired/)).toBeInTheDocument()
    mock.restore()
  })
})