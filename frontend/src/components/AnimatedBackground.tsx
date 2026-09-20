const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: 3 + ((i * 83) % 94),
  top: 6 + ((i * 37) % 72),
  size: 2 + (i % 3) * 2,
  duration: 14 + (i % 5) * 4,
  delay: (i * 1.7) % 18,
  opacity: 0.1 + (i % 3) * 0.06,
}))

export function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <div className="animated-bg__base" />
      <div className="animated-bg__orb animated-bg__orb--1" />
      <div className="animated-bg__orb animated-bg__orb--2" />
      <div className="animated-bg__orb animated-bg__orb--3" />
      <div className="animated-bg__wave animated-bg__wave--1" />
      <div className="animated-bg__wave animated-bg__wave--2" />
      <div className="animated-bg__grid" />
      <div className="animated-bg__particles">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="animated-bg__particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ['--p-op' as string]: p.opacity,
            }}
          />
        ))}
      </div>
    </div>
  )
}