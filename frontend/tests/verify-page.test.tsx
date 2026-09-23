import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import VerifyPage from '../src/pages/VerifyPage'
import { createMock } from './test-utils'

function renderVerify() {
  return render(
    <MemoryRouter initialEntries={['/verify']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>WEBSITE_HOME</div>} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/account" element={<div>ACCOUNT_PAGE</div>} />
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

// Persist a pending challenge in the auth context before rendering the page.
function primeChallenge(mock_code: string | null) {
  sessionStorage.setItem('marketplace:pending-challenge', JSON.stringify({
    id: 'u1',
    user_id: 'u1',
    challenge_id: 'ch1',
    purpose: 'REGISTER',
    expires_at: new Date(Date.now() + 300000).toISOString(),
    resend_after_seconds: 30,
    mock_code,
    email: 'farmer@example.com',
  }))
}

describe('VerifyPage', () => {
  it('keeps the submit button disabled until all six digits are entered', async () => {
    const user = userEvent.setup()
    sessionStorage.clear()
    primeChallenge(null)
    const mock = createMock()
    mock.onPost('/auth/otp/verify').reply(200, {
      user_id: 'u1',
      role: 'FARMER',
      status: 'ACTIVE',
      tokens: { access_token: 'a', refresh_token: 'r', token_type: 'bearer', expires_in: 600 },
    })

    renderVerify()
    const submit = screen.getByRole('button', { name: /Verify & Access Account/i })
    expect(submit).toBeDisabled()

    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i + 1}`), String(i + 1))
    }
    await waitFor(() => expect(submit).toBeEnabled())
    mock.restore()
  })

  it('does not display mock OTP code and shows the back to website button', async () => {
    sessionStorage.clear()
    primeChallenge('654321')

    renderVerify()
    expect(screen.queryByText(/654321/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Auto-Fill/i)).not.toBeInTheDocument()

    const backLink = screen.getByRole('link', { name: /Back to Website/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('shows an inline error when verification fails', async () => {
    const user = userEvent.setup()
    sessionStorage.clear()
    primeChallenge(null)
    const mock = createMock()
    mock.onPost('/auth/otp/verify').reply(401, { detail: 'Invalid or expired code' })

    renderVerify()
    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByLabelText(`Digit ${i + 1}`), '0')
    }
    await user.click(screen.getByRole('button', { name: /Verify & Access Account/i }))

    expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument()
    mock.restore()
  })

  it('redirects to login when there is no pending challenge', () => {
    sessionStorage.clear()
    renderVerify()
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument()
  })
})