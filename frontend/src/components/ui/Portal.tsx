import { useState } from 'react'
import * as ReactDOM from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  container?: HTMLElement | null
}

export function Portal({ children, container }: PortalProps) {
  const [portalRoot] = useState<HTMLElement | null>(() =>
    typeof window !== 'undefined' ? (container ?? document.getElementById('modal-root')) : null,
  )

  if (!portalRoot) {
    return null
  }

  return ReactDOM.createPortal(children, portalRoot)
}

export type { PortalProps }