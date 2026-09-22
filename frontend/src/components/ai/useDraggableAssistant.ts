import { useState, useEffect, useRef, useCallback } from 'react'

export interface Position {
  x: number
  y: number
}

const STORAGE_KEY = 'agridirect-assistant-position'
const PADDING = 20

export function useDraggableAssistant(initialBottomOffset = 90, initialRightOffset = 24) {
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed
        }
      }
    } catch {}
    // Default: bottom-right
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth - 180 - initialRightOffset,
        y: window.innerHeight - 60 - initialBottomOffset,
      }
    }
    return { x: 100, y: 100 }
  })

  const isDraggingRef = useRef(false)
  const dragStartPosRef = useRef<Position>({ x: 0, y: 0 })
  const elementStartPosRef = useRef<Position>({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

  // Re-clamp on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 180 - PADDING
        const maxY = window.innerHeight - 60 - PADDING
        const clampedX = Math.max(PADDING, Math.min(prev.x, maxX))
        const clampedY = Math.max(PADDING, Math.min(prev.y, maxY))
        return { x: clampedX, y: clampedY }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse Drag Handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only drag with left click
      if (e.button !== 0) return
      isDraggingRef.current = true
      hasMovedRef.current = false
      dragStartPosRef.current = { x: e.clientX, y: e.clientY }
      elementStartPosRef.current = { ...position }
    },
    [position]
  )

  // Touch Drag Handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      isDraggingRef.current = true
      hasMovedRef.current = false
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      elementStartPosRef.current = { ...position }
    },
    [position]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const deltaX = e.clientX - dragStartPosRef.current.x
      const deltaY = e.clientY - dragStartPosRef.current.y

      if (Math.hypot(deltaX, deltaY) > 6) {
        hasMovedRef.current = true
      }

      const maxX = window.innerWidth - 180 - PADDING
      const maxY = window.innerHeight - 60 - PADDING

      const newX = Math.max(PADDING, Math.min(elementStartPosRef.current.x + deltaX, maxX))
      const newY = Math.max(PADDING, Math.min(elementStartPosRef.current.y + deltaY, maxY))

      setPosition({ x: newX, y: newY })
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const deltaX = touch.clientX - dragStartPosRef.current.x
      const deltaY = touch.clientY - dragStartPosRef.current.y

      if (Math.hypot(deltaX, deltaY) > 6) {
        hasMovedRef.current = true
      }

      const maxX = window.innerWidth - 180 - PADDING
      const maxY = window.innerHeight - 60 - PADDING

      const newX = Math.max(PADDING, Math.min(elementStartPosRef.current.x + deltaX, maxX))
      const newY = Math.max(PADDING, Math.min(elementStartPosRef.current.y + deltaY, maxY))

      setPosition({ x: newX, y: newY })
    }

    const onEnd = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      if (hasMovedRef.current) {
        // Snap gently to closest edge (left or right)
        setPosition((current) => {
          const midX = window.innerWidth / 2
          const maxX = window.innerWidth - 180 - PADDING
          const snappedX = current.x < midX ? PADDING : maxX
          const finalPos = { x: snappedX, y: current.y }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos))
          } catch {}
          return finalPos
        })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  return {
    position,
    onMouseDown,
    onTouchStart,
    hasMoved: () => hasMovedRef.current,
  }
}
