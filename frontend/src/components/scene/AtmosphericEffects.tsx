import React from 'react'

interface AtmosphericEffectsProps {
  timeOfDay?: 'golden' | 'day' | 'twilight' | 'night'
}

export const AtmosphericEffects: React.FC<AtmosphericEffectsProps> = ({
  timeOfDay = 'golden',
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-25 overflow-hidden">
      {/* Soft Volumetric Horizon Mist */}
      <div
        className="absolute bottom-[24%] left-0 right-0 h-36 blur-xl opacity-35"
        style={{
          background:
            timeOfDay === 'golden'
              ? 'linear-gradient(to top, rgba(251, 191, 36, 0.35), rgba(245, 158, 11, 0.1), transparent)'
              : timeOfDay === 'day'
              ? 'linear-gradient(to top, rgba(254, 240, 138, 0.25), rgba(187, 247, 208, 0.1), transparent)'
              : timeOfDay === 'night'
              ? 'linear-gradient(to top, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.08), transparent)'
              : 'linear-gradient(to top, rgba(244, 63, 94, 0.25), rgba(168, 85, 247, 0.1), transparent)',
        }}
      />

      {/* Floating Dust / Pollen / Fireflies Motes */}
      <div className="absolute inset-0">
        {Array.from({ length: 16 }).map((_, i) => {
          // Deterministic positions and timings
          const left = ((i * 19 + 7) % 94) + 3
          const top = ((i * 23 + 13) % 75) + 15
          const size = (i % 3) + 2
          const duration = 12 + (i % 8) * 2
          const delay = (i * 1.5) % 9
          const opacity = 0.35 + (i % 5) * 0.12

          return (
            <div
              key={`dust-mote-${i}`}
              className="absolute rounded-full pointer-events-none animate-dust-float"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor:
                  timeOfDay === 'golden'
                    ? '#fef08a'
                    : timeOfDay === 'day'
                    ? '#ffffff'
                    : timeOfDay === 'night'
                    ? '#6ee7b7'
                    : '#fed7aa',
                boxShadow: `0 0 8px 2px ${
                  timeOfDay === 'golden'
                    ? 'rgba(251, 191, 36, 0.6)'
                    : timeOfDay === 'day'
                    ? 'rgba(255, 255, 255, 0.5)'
                    : timeOfDay === 'night'
                    ? 'rgba(52, 211, 153, 0.8)'
                    : 'rgba(244, 63, 94, 0.5)'
                }`,
                opacity,
                animationDuration: `${duration}s`,
                animationDelay: `-${delay}s`,
              }}
            />
          )
        })}
      </div>

      {/* Ambient Vignette & Depth Wash */}
      <div className="absolute inset-0 bg-radial-vignette opacity-40 pointer-events-none" />
    </div>
  )
}
