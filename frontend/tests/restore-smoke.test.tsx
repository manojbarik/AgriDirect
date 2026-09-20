import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/contexts/AuthContext'
import LoginPage from '../src/pages/LoginPage'
import RegisterPage from '../src/pages/RegisterPage'
import VerifyPage from '../src/pages/VerifyPage'
import ForgotPasswordPage from '../src/pages/ForgotPasswordPage'

function renderLogin(route = '/login') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Original AgriDirect dark-glass auth (first UI)', () => {
  it('login shows the original glass Welcome Back screen', () => {
    renderLogin()
    expect(screen.getByText(/Welcome Back/i)).toBeTruthy()
    expect(screen.getAllByText(/AgriDirect/i).length).toBeGreaterThan(0)
  })
  it('register shows original glass Create Account screen', () => {
    renderLogin('/register')
    expect(screen.getByText(/Phone number/i)).toBeTruthy()
  })
  it('verify shows original OTP screen', () => {
    renderLogin('/verify')
    expect(screen.getByText(/Welcome Back/i)).toBeTruthy()
  })
  it('forgot shows restore email form', () => {
    renderLogin('/forgot-password')
    expect(screen.getByText(/Email or phone number/)).toBeTruthy()
  })
})
