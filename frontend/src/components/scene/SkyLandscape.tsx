import React from 'react'
import { motion, MotionValue } from 'framer-motion'

interface SkyLandscapeProps {
  skyY?: MotionValue<number>
  skyX?: MotionValue<number>
  landscapeY?: MotionValue<number>
  landscapeX?: MotionValue<number>
  timeOfDay?: 'golden' | 'day' | 'twilight' | 'night'
}

// Deterministic array of 75 twinkling stars for night sky
const NIGHT_STARS = Array.from({ length: 75 }).map((_, i) => ({
  id: i,
  left: `${((i * 37 + 13) % 96) + 2}%`,
  top: `${((i * 47 + 7) % 52) + 2}%`,
  size: (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1.5),
  opacity: 0.4 + ((i * 13) % 60) / 100,
  delay: ((i * 0.3) % 4).toFixed(1),
  duration: (2 + (i % 3) * 1.2).toFixed(1),
}))

export const SkyLandscape: React.FC<SkyLandscapeProps> = ({
  skyY,
  skyX,
  landscapeY,
  landscapeX,
  timeOfDay = 'golden',
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* ================= LAYER 1: SKY, STARS & CELESTIAL BODIES ================= */}
      <motion.div
        className="absolute -inset-[5%] w-[110%] h-[110%]"
        style={{ x: skyX, y: skyY }}
      >
        {/* Dynamic Sky Gradient according to time of day */}
        <div
          className={`absolute inset-0 transition-colors duration-1000 ${
            timeOfDay === 'golden'
              ? 'bg-gradient-to-b from-[#1b2f29] via-[#3d5038] via-[#856b3e] via-[#cf9b4c] to-[#f7ddaa]'
              : timeOfDay === 'day'
              ? 'bg-gradient-to-b from-[#164e63] via-[#0284c7] via-[#38bdf8] via-[#7dd3fc] to-[#e0f2fe]'
              : timeOfDay === 'night'
              ? 'bg-gradient-to-b from-[#020617] via-[#081026] via-[#0e1d3a] via-[#0f2b38] to-[#123832]'
              : 'bg-gradient-to-b from-[#0f172a] via-[#1e2342] via-[#4c3558] via-[#854d58] to-[#c77a64]'
          }`}
        />

        {/* NIGHT MODE: Realistic Twinkling Starfield */}
        {timeOfDay === 'night' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {NIGHT_STARS.map((star) => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white transition-opacity animate-pulse"
                style={{
                  left: star.left,
                  top: star.top,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  boxShadow: star.size > 2 ? '0 0 6px 2px rgba(255, 255, 255, 0.9)' : '0 0 3px 1px rgba(255, 255, 255, 0.6)',
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                  opacity: star.opacity,
                }}
              />
            ))}

            {/* Shooting Star Animation across upper night sky */}
            <div className="absolute top-[12%] left-[20%] w-[120px] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[-25deg] opacity-70 animate-pulse" />
            <div className="absolute top-[22%] left-[70%] w-[90px] h-[1px] bg-gradient-to-r from-transparent via-cyan-200 to-transparent rotate-[-30deg] opacity-60 animate-pulse" style={{ animationDelay: '2.5s' }} />
          </div>
        )}

        {/* Ambient Radial Celestial Glow (Sun in Day/Dawn, Moon in Night) */}
        <div
          className="absolute top-[28%] left-[62%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl opacity-80 mix-blend-screen transition-all duration-1000"
          style={{
            background:
              timeOfDay === 'golden'
                ? 'radial-gradient(circle, rgba(255,245,210,0.85) 0%, rgba(251,191,36,0.45) 45%, rgba(217,119,6,0.1) 75%, transparent 100%)'
                : timeOfDay === 'day'
                ? 'radial-gradient(circle, rgba(255,255,240,0.95) 0%, rgba(254,240,138,0.55) 40%, rgba(186,230,253,0.2) 70%, transparent 100%)'
                : timeOfDay === 'night'
                ? 'radial-gradient(circle, rgba(224,242,254,0.7) 0%, rgba(56,189,248,0.2) 40%, rgba(15,23,42,0.05) 75%, transparent 100%)'
                : 'radial-gradient(circle, rgba(254,215,170,0.7) 0%, rgba(244,63,94,0.35) 45%, rgba(147,51,234,0.1) 75%, transparent 100%)',
          }}
        />

        {/* Celestial Body: Radiant Sun (Day/Dawn) OR Silvery Moon (Night) */}
        {timeOfDay === 'night' ? (
          /* Moon Disc */
          <div
            className="absolute top-[28%] left-[64%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-[1px] opacity-95 transition-all duration-1000"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f1f5f9 45%, #cbd5e1 80%, #94a3b8 100%)',
              boxShadow: '0 0 60px 20px rgba(224, 242, 254, 0.4), inset -4px -4px 10px rgba(71, 85, 105, 0.4)',
            }}
          >
            {/* Subtle lunar surface craters */}
            <div className="absolute top-4 left-6 w-3 h-3 rounded-full bg-slate-300/40 blur-[0.5px]" />
            <div className="absolute top-9 left-11 w-4 h-4 rounded-full bg-slate-300/30 blur-[0.5px]" />
            <div className="absolute top-12 left-5 w-2.5 h-2.5 rounded-full bg-slate-300/35 blur-[0.5px]" />
          </div>
        ) : (
          /* Radiant Sun Disc */
          <div
            className="absolute top-[32%] left-[62%] -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-[2px] opacity-95 transition-all duration-1000"
            style={{
              background:
                timeOfDay === 'golden'
                  ? 'radial-gradient(circle, #fffdf0 20%, #fed7aa 70%, rgba(251,146,60,0.4) 100%)'
                  : timeOfDay === 'day'
                  ? 'radial-gradient(circle, #ffffff 45%, #fef08a 85%, rgba(253,224,71,0.6) 100%)'
                  : 'radial-gradient(circle, #ffedd5 20%, #fb923c 75%, rgba(225,29,72,0.4) 100%)',
              boxShadow:
                timeOfDay === 'day'
                  ? '0 0 100px 40px rgba(253, 224, 71, 0.6), 0 0 40px 10px rgba(255, 255, 255, 0.8)'
                  : '0 0 80px 30px rgba(253, 224, 71, 0.45)',
            }}
          />
        )}

        {/* Day God Rays / Sunlight Volumetric Mesh */}
        {timeOfDay !== 'night' && (
          <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none bg-[radial-gradient(ellipse_at_62%_32%,_var(--tw-gradient-stops))] from-amber-100/70 via-amber-200/15 to-transparent" />
        )}

        {/* Soft Drifting Cinematic Clouds (Visible in Day & Golden) */}
        {timeOfDay !== 'night' && (
          <>
            <svg
              className="absolute top-[8%] left-0 w-[200%] h-48 opacity-45 animate-cloud-drift-slow"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="rgba(255, 255, 255, 0.3)"
                d="M0,96L48,112C96,128,192,160,288,154.7C384,149,480,107,576,101.3C672,96,768,128,864,138.7C960,149,1056,139,1152,117.3C1248,96,1344,64,1392,48L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
              />
            </svg>

            <svg
              className="absolute top-[18%] left-0 w-[200%] h-40 opacity-35 animate-cloud-drift-fast"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="rgba(254, 240, 138, 0.32)"
                d="M0,192L60,186.7C120,181,240,171,360,144C480,117,600,75,720,80C840,85,960,139,1080,149.3C1200,160,1320,128,1380,112L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
              />
            </svg>
          </>
        )}
      </motion.div>

      {/* ================= LAYER 2: DISTANT LANDSCAPE & HORIZON RIDGE ================= */}
      <motion.div
        className="absolute -inset-[3%] w-[106%] h-[106%]"
        style={{ x: landscapeX, y: landscapeY }}
      >
        {/* Layer 2A: Deep Far Mountains (Atmospheric Depth & Blur) */}
        <div className="absolute bottom-[38%] left-0 right-0 h-56 filter blur-[1.5px] opacity-70">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="farMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4a6352" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#2c4436" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1e3427" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              fill="url(#farMountainGrad)"
              d="M0,160L40,149.3C80,139,160,117,240,122.7C320,128,400,160,480,176C560,192,640,192,720,176C800,160,880,128,960,117.3C1040,107,1120,117,1200,138.7C1280,160,1360,192,1400,208L1440,224L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"
            />
          </svg>
        </div>

        {/* Atmospheric Mist Layer between mountain ridges */}
        <div className="absolute bottom-[36%] left-0 right-0 h-24 bg-gradient-to-t from-[#8da68c]/35 via-[#e2be89]/20 to-transparent blur-md" />

        {/* Layer 2B: Mid-Distant Rolling Hills & Forest Canopy */}
        <div className="absolute bottom-[30%] left-0 right-0 h-44">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 240"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="midHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3d5843" />
                <stop offset="60%" stopColor="#28422f" />
                <stop offset="100%" stopColor="#1a2e21" />
              </linearGradient>
            </defs>
            <path
              fill="url(#midHillGrad)"
              d="M0,96L48,112C96,128,192,160,288,149.3C384,139,480,85,576,90.7C672,96,768,160,864,170.7C960,181,1056,139,1152,117.3C1248,96,1344,96,1392,96L1440,96L1440,240L1392,240C1344,240,1248,240,1152,240C1056,240,960,240,864,240C768,240,672,240,576,240C480,240,384,240,288,240C192,240,96,240,48,240L0,240Z"
            />
            {/* Distant farm tree and silo silhouettes */}
            <g fill="#1f3627" opacity="0.9">
              {/* Left cluster trees */}
              <circle cx="120" cy="115" r="14" />
              <circle cx="140" cy="110" r="18" />
              <circle cx="165" cy="118" r="12" />
              <circle cx="210" cy="130" r="10" />
              <circle cx="320" cy="142" r="16" />
              <circle cx="345" cy="138" r="12" />
              {/* Distant Windmill silhouette */}
              <path d="M510,135 L514,75 L518,135 Z" fill="#2d4233" />
              <line x1="514" y1="75" x2="498" y2="60" stroke="#3d5843" strokeWidth="2" />
              <line x1="514" y1="75" x2="530" y2="90" stroke="#3d5843" strokeWidth="2" />
              <line x1="514" y1="75" x2="528" y2="62" stroke="#3d5843" strokeWidth="2" />
              <line x1="514" y1="75" x2="500" y2="88" stroke="#3d5843" strokeWidth="2" />
              {/* Right cluster trees & horizon ridge */}
              <circle cx="920" cy="165" r="14" />
              <circle cx="945" cy="158" r="18" />
              <circle cx="975" cy="162" r="15" />
              <circle cx="1280" cy="100" r="22" />
              <circle cx="1310" cy="94" r="18" />
              <circle cx="1340" cy="105" r="15" />
            </g>
          </svg>
        </div>

        {/* Horizon Warm Golden Glow Filter */}
        <div className="absolute bottom-[28%] left-0 right-0 h-16 bg-gradient-to-b from-transparent via-[#d89f4b]/20 to-[#47341e]/40 pointer-events-none" />
      </motion.div>
    </div>
  )
}
