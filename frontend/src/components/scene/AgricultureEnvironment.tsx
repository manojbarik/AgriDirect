import React, { useEffect, useState } from 'react'
import { useMotionValue, useSpring, useTransform } from 'framer-motion'
import { SkyLandscape } from './SkyLandscape'
import { FarmCrops } from './FarmCrops'
import { FarmerFigure } from './FarmerFigure'
import { AtmosphericEffects } from './AtmosphericEffects'

export type EnvironmentVariant =
  | 'hero'
  | 'marketplace'
  | 'dashboard'
  | 'orders'
  | 'profile'
  | 'admin'
  | 'auth'
  | 'minimal'

interface AgricultureEnvironmentProps {
  children?: React.ReactNode
  variant?: EnvironmentVariant
  timeOfDay?: 'golden' | 'day' | 'twilight' | 'night'
  showFarmer?: boolean
  className?: string
  contentClassName?: string
  id?: string
}

export const AgricultureEnvironment: React.FC<AgricultureEnvironmentProps> = ({
  children,
  variant = 'dashboard',
  timeOfDay = 'golden',
  showFarmer,
  className = '',
  contentClassName = '',
  id,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch {
        return false
      }
    }
    return false
  })
  const [isMobile, setIsMobile] = useState(false)

  // Mouse coordinate normalization (-1 to 1)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for buttery smooth dampening
  const springConfig = { damping: 28, stiffness: 85, mass: 0.6 }
  const smoothMouseX = useSpring(mouseX, springConfig)
  const smoothMouseY = useSpring(mouseY, springConfig)

  // Layer parallax calculations based on variant intensity
  const intensity = variant === 'hero' ? 1.0 : variant === 'marketplace' ? 0.6 : 0.35

  const skyX = useTransform(smoothMouseX, [-1, 1], prefersReducedMotion ? [0, 0] : [-4 * intensity, 4 * intensity])
  const skyY = useTransform(smoothMouseY, [-1, 1], prefersReducedMotion ? [0, 0] : [-3 * intensity, 3 * intensity])

  const landscapeX = useTransform(smoothMouseX, [-1, 1], prefersReducedMotion ? [0, 0] : [-10 * intensity, 10 * intensity])
  const landscapeY = useTransform(smoothMouseY, [-1, 1], prefersReducedMotion ? [0, 0] : [-8 * intensity, 8 * intensity])

  const fieldX = useTransform(smoothMouseX, [-1, 1], prefersReducedMotion ? [0, 0] : [-18 * intensity, 18 * intensity])
  const fieldY = useTransform(smoothMouseY, [-1, 1], prefersReducedMotion ? [0, 0] : [-12 * intensity, 12 * intensity])

  const farmerX = useTransform(smoothMouseX, [-1, 1], prefersReducedMotion ? [0, 0] : [-26 * intensity, 26 * intensity])
  const farmerY = useTransform(smoothMouseY, [-1, 1], prefersReducedMotion ? [0, 0] : [-18 * intensity, 18 * intensity])

  const foregroundX = useTransform(smoothMouseX, [-1, 1], prefersReducedMotion ? [0, 0] : [-36 * intensity, 36 * intensity])
  const foregroundY = useTransform(smoothMouseY, [-1, 1], prefersReducedMotion ? [0, 0] : [-24 * intensity, 24 * intensity])

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

        const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      } catch {
        // fallback
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || isMobile) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const shouldRenderFarmer = showFarmer !== undefined ? showFarmer : (variant === 'hero' || variant === 'marketplace' || variant === 'dashboard')

  // Scrim opacity tuned per variant to keep text 100% crisp and readable
  const overlayOpacity = 
    variant === 'hero'
      ? 'bg-[#070f0b]/30'
      : variant === 'marketplace'
      ? 'bg-[#070f0b]/60 backdrop-blur-[2px]'
      : variant === 'dashboard'
      ? 'bg-[#070f0b]/75 backdrop-blur-[4px]'
      : variant === 'admin'
      ? 'bg-[#050b08]/85 backdrop-blur-[6px]'
      : variant === 'auth'
      ? 'bg-[#070f0b]/50 backdrop-blur-[3px]'
      : 'bg-[#070f0b]/70 backdrop-blur-[3px]'

  return (
    <div
      id={id || (variant === 'hero' ? 'hero-cinematic-scene' : undefined)}
      className={`relative min-h-screen w-full overflow-x-hidden bg-[#070f0b] text-slate-100 select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Environment Layers (Fixed behind content) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Layer 1 & 2: Sky & Mountains */}
        <SkyLandscape
          skyX={skyX}
          skyY={skyY}
          landscapeX={landscapeX}
          landscapeY={landscapeY}
          timeOfDay={timeOfDay}
        />

        {/* Layer 3: Fields & Midground Crops */}
        <FarmCrops
          fieldX={fieldX}
          fieldY={fieldY}
          foregroundX={foregroundX}
          foregroundY={foregroundY}
          timeOfDay={timeOfDay}
        />

        {/* Layer 4: Farmer Figure (nested inside crop rows) */}
        {shouldRenderFarmer && (
          <FarmerFigure
            farmerX={farmerX}
            farmerY={farmerY}
            timeOfDay={timeOfDay}
          />
        )}

        {/* Layer 5: Atmospheric Mists, Floating Dust, Godrays */}
        <AtmosphericEffects timeOfDay={timeOfDay} />

        {/* Tech Grid Overlay for futuristic dashboard/admin variants */}
        {(variant === 'dashboard' || variant === 'admin') && (
          <div 
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.4) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }}
          />
        )}

        {/* Dynamic Darkening Scrim per page variant for content readability */}
        <div className={`absolute inset-0 transition-all duration-500 pointer-events-none ${overlayOpacity}`} />
      </div>

      {/* Dynamic Interactive Page Content */}
      <div className={`relative z-10 min-h-screen flex flex-col pointer-events-auto ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}
