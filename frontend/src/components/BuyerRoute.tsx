import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export default function BuyerRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()

  if (initializing) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'BUYER' && user.role !== 'BULK_BUYER') return <Navigate to="/account" replace />
  return children
}