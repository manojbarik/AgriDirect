import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import ProtectedRoute from '../src/components/ProtectedRoute'
import AdminRoute from '../src/components/AdminRoute'
import FarmerRoute from '../src/components/FarmerRoute'
import BuyerRoute from '../src/components/BuyerRoute'
import { createMock, mockTokensAndUser, renderWithProviders } from './test-utils'

function shell() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><div>PROTECTED_HOME</div></ProtectedRoute>} />
      <Route path="/login" element={<div>LOGIN_PAGE</div>} />
      <Route path="/account" element={<div>ACCOUNT_PAGE</div>} />
      <Route path="/admin" element={<AdminRoute><div>ADMIN_ONLY</div></AdminRoute>} />
      <Route path="/farmer" element={<FarmerRoute><div>FARMER_ONLY</div></FarmerRoute>} />
      <Route path="/buyer" element={<BuyerRoute><div>BUYER_ONLY</div></BuyerRoute>} />
    </Routes>
  )
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated user to /login', () => {
    renderWithProviders(shell(), ['/'])
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument()
  })

  it('allows an authenticated farmer through', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'FARMER')
    renderWithProviders(shell(), ['/'])
    expect(await screen.findByText('PROTECTED_HOME')).toBeInTheDocument()
    mock.restore()
  })
})

describe('role guards', () => {
  it('renders admin child only for an ADMIN user', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'ADMIN')
    renderWithProviders(shell(), ['/admin'])
    await waitFor(() => expect(screen.queryByText('ACCOUNT_PAGE')).not.toBeInTheDocument())
    expect(await screen.findByText('ADMIN_ONLY')).toBeInTheDocument()
    mock.restore()
  })

  it('redirects a non-admin to /account', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'FARMER')
    renderWithProviders(shell(), ['/admin'])
    expect(await screen.findByText('ACCOUNT_PAGE')).toBeInTheDocument()
    mock.restore()
  })

  it('renders FarmerRoute only for FARMER', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'FARMER')
    renderWithProviders(shell(), ['/farmer'])
    expect(await screen.findByText('FARMER_ONLY')).toBeInTheDocument()
    mock.restore()
  })

  it('redirects a farmer from a buyer route', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'FARMER')
    renderWithProviders(shell(), ['/buyer'])
    expect(await screen.findByText('ACCOUNT_PAGE')).toBeInTheDocument()
    mock.restore()
  })

  it('renders BuyerRoute only for BUYER', async () => {
    const mock = createMock()
    mockTokensAndUser(mock, 'BUYER')
    renderWithProviders(shell(), ['/buyer'])
    expect(await screen.findByText('BUYER_ONLY')).toBeInTheDocument()
    mock.restore()
  })

  it('redirects an unauthenticated user from a role route', () => {
    const mock = createMock()
    renderWithProviders(shell(), ['/admin'])
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument()
    mock.restore()
  })
})