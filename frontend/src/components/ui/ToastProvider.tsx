/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import { ToastContainer, useToast as useToastHook } from './Toast'

interface ToastContextType {
  toast: ReturnType<typeof useToastHook>['toast']
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toast, toasts, removeToast } = useToastHook()

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} position="top-right" />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.toast
}
/* eslint-enable react-refresh/only-export-components */