import React from 'react'
import { motion, MotionValue } from 'framer-motion'

interface FarmCropsProps {
  fieldY?: MotionValue<number>
  fieldX?: MotionValue<number>
  foregroundY?: MotionValue<number>
  foregroundX?: MotionValue<number>
  timeOfDay?: 'golden' | 'day' | 'twilight' | 'night'
}

export const FarmCrops: React.FC<FarmCropsProps> = ({
  fieldY,
  fieldX,
  foregroundY,
  foregroundX,
  timeOfDay = 'golden',
}) => {
  return (
    <>
      {/* ================= LAYER 3: MIDGROUND FARM FIELD & PERSPECTIVE FURROWS ================= */}
      <motion.div
        className="absolute inset-0 pointer-events-none select-none z-10"
        style={{ x: fieldX, y: fieldY }}
      >
        {/* Perspective Tilled Earth Base */}
        <div className="absolute bottom-0 left-0 right-0 h-[48%] bg-gradient-to-b from-[#2a1d13] via-[#3a281a] via-[#4d3623] to-[#25180f] overflow-hidden">
          {/* Subtle Terraced Ridge Lines & Soil Gradient Texture */}
          <svg
            className="absolute inset-0 w-full h-full opacity-60"
            viewBox="0 0 1440 600"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="soilLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8c6239" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#573b22" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2c1a0e" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="furrowShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#120c07" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1e130b" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Converging Furrow Perspective Lines radiating from the horizon (vanishing point around cx: 580, cy: 0) */}
            <g stroke="#61442a" strokeWidth="1.5" opacity="0.75">
              <path d="M580,0 L-100,600" />
              <path d="M580,0 L80,600" />
              <path d="M580,0 L240,600" />
              <path d="M580,0 L420,600" />
              <path d="M580,0 L600,600" />
              <path d="M580,0 L780,600" />
              <path d="M580,0 L960,600" />
              <path d="M580,0 L1180,600" />
              <path d="M580,0 L1400,600" />
              <path d="M580,0 L1650,600" />
            </g>

            {/* Secondary deep shadow furrows for 3D depth */}
            <g stroke="#180e07" strokeWidth="3" opacity="0.6">
              <path d="M580,0 L-40,600" />
              <path d="M580,0 L320,600" />
              <path d="M580,0 L690,600" />
              <path d="M580,0 L1070,600" />
              <path d="M580,0 L1520,600" />
            </g>
          </svg>

          {/* Golden Ambient Sunlight Wash across the field */}
          <div
            className={`absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-1000 ${
              timeOfDay === 'golden'
                ? 'opacity-40 bg-gradient-to-tr from-transparent via-[#f59e0b]/20 to-[#fef08a]/35'
                : timeOfDay === 'day'
                ? 'opacity-30 bg-gradient-to-tr from-transparent via-[#86efac]/15 to-[#fef08a]/25'
                : 'opacity-20 bg-gradient-to-tr from-transparent via-[#fb7185]/15 to-[#f43f5e]/20'
            }`}
          />
        </div>

        {/* Midground Crop Row 1 (Horizon border - small scale wheat/crop bands) */}
        <div className="absolute bottom-[44%] left-0 right-0 h-16 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path
              d="M0,45 Q60,35 120,44 T240,40 T360,46 T480,38 T600,44 T720,40 T840,45 T960,39 T1080,44 T1200,40 T1320,45 T1440,42 L1440,80 L0,80 Z"
              fill="#42552d"
              opacity="0.9"
            />
            {/* Small crop tufts along distant horizon */}
            <g fill="#617a3a" opacity="0.85">
              {Array.from({ length: 24 }).map((_, i) => (
                <path
                  key={`crop-dist-${i}`}
                  d={`M${i * 62 + 10},45 Q${i * 62 + 15},22 ${i * 62 + 18},45 Q${i * 62 + 22},24 ${i * 62 + 25},45`}
                  stroke="#577033"
                  strokeWidth="2.5"
                  fill="none"
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Midground Crop Row 2 (Behind Farmer depth - height around 34%-42%) */}
        <div className="absolute bottom-[32%] left-0 right-0 h-24 pointer-events-none">
          <svg className="w-full h-full animate-crop-sway-slow" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,60 Q90,48 180,62 T360,55 T540,64 T720,56 T900,63 T1080,55 T1260,62 T1440,58 L1440,120 L0,120 Z"
              fill="#3a4b27"
              opacity="0.95"
            />
            {/* Mid-scale wheat heads and stalks swaying */}
            <g stroke="#7b9144" strokeWidth="3" fill="none" opacity="0.9">
              {Array.from({ length: 18 }).map((_, i) => {
                const x = i * 82 + 15
                return (
                  <g key={`mid-wheat-${i}`}>
                    <path d={`M${x},60 Q${x + 6},25 ${x + 2},5`} />
                    <ellipse cx={x + 3} cy="8" rx="4" ry="10" fill="#a48c48" stroke="none" transform={`rotate(12 ${x + 3} 8)`} />
                    <path d={`M${x + 14},62 Q${x + 20},30 ${x + 18},12`} />
                    <ellipse cx={x + 19} cy="15" rx="3.5" ry="9" fill="#cbb262" stroke="none" transform={`rotate(-8 ${x + 19} 15)`} />
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        {/* Midground Crop Row 3 (Directly around farmer's feet level - creates embedding in soil) */}
        <div className="absolute bottom-[20%] left-0 right-0 h-32 pointer-events-none">
          <svg className="w-full h-full animate-crop-sway-med" viewBox="0 0 1440 160" preserveAspectRatio="none">
            <path
              d="M0,80 Q120,62 240,82 T480,75 T720,84 T960,74 T1200,83 T1440,77 L1440,160 L0,160 Z"
              fill="#2e3e20"
            />
            {/* Detailed stalks that rise up in front of farmer's legs */}
            <g stroke="#677f37" strokeWidth="4" fill="none">
              {Array.from({ length: 14 }).map((_, i) => {
                const x = i * 105 + 20
                return (
                  <g key={`mid-wheat-close-${i}`}>
                    <path d={`M${x},80 Q${x + 10},40 ${x + 6},15`} />
                    <ellipse cx={x + 7} cy="18" rx="5" ry="14" fill="#cca349" stroke="none" transform={`rotate(10 ${x + 7} 18)`} />
                    <path d={`M${x + 22},82 Q${x + 15},42 ${x + 18},20`} />
                    <ellipse cx={x + 18} cy="22" rx="4.5" ry="12" fill="#dfb95c" stroke="none" transform={`rotate(-12 ${x + 18} 22)`} />
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </motion.div>

      {/* ================= LAYER 5: FOREGROUND CROPS & FOLIAGE ================= */}
      {/* High-contrast, larger detailed crops framing the lower viewport, moving with strongest parallax */}
      <motion.div
        className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden"
        style={{ x: foregroundX, y: foregroundY }}
      >
        {/* Left-side Foreground Wheat / Foliage cluster */}
        <div className="absolute -bottom-6 -left-8 w-96 h-80 filter drop-shadow-2xl">
          <svg className="w-full h-full animate-crop-sway-fast" viewBox="0 0 400 360" fill="none">
            <defs>
              <linearGradient id="fgWheatGrad1" x1="0%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#192716" />
                <stop offset="60%" stopColor="#3d5727" />
                <stop offset="100%" stopColor="#c59f42" />
              </linearGradient>
              <linearGradient id="fgWheatEarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#b48633" />
                <stop offset="70%" stopColor="#deb355" />
                <stop offset="100%" stopColor="#ffea9f" />
              </linearGradient>
            </defs>

            {/* Large Foreground Stalk 1 */}
            <path d="M40,360 Q70,200 120,60" stroke="url(#fgWheatGrad1)" strokeWidth="6" strokeLinecap="round" />
            <g transform="translate(120, 60) rotate(22)">
              <ellipse cx="0" cy="0" rx="9" ry="34" fill="url(#fgWheatEarGrad)" />
              {/* Beards / awns */}
              <line x1="-5" y1="-20" x2="-25" y2="-55" stroke="#ffe594" strokeWidth="2" />
              <line x1="0" y1="-30" x2="0" y2="-70" stroke="#ffe594" strokeWidth="2" />
              <line x1="5" y1="-20" x2="25" y2="-55" stroke="#ffe594" strokeWidth="2" />
              {/* Seed grains */}
              <circle cx="-3" cy="-12" r="3.5" fill="#8f641b" />
              <circle cx="3" cy="-6" r="3.5" fill="#8f641b" />
              <circle cx="-3" cy="4" r="3.5" fill="#8f641b" />
              <circle cx="3" cy="12" r="3.5" fill="#8f641b" />
            </g>

            {/* Large Foreground Stalk 2 */}
            <path d="M110,360 Q130,220 180,90" stroke="url(#fgWheatGrad1)" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(180, 90) rotate(14)">
              <ellipse cx="0" cy="0" rx="8" ry="30" fill="url(#fgWheatEarGrad)" />
              <line x1="-4" y1="-18" x2="-20" y2="-50" stroke="#ffe594" strokeWidth="1.8" />
              <line x1="0" y1="-26" x2="4" y2="-62" stroke="#ffe594" strokeWidth="1.8" />
              <line x1="4" y1="-18" x2="20" y2="-48" stroke="#ffe594" strokeWidth="1.8" />
            </g>

            {/* Foreground Arching Leaf */}
            <path
              d="M60,340 C110,240 180,220 230,250 C180,260 120,280 60,340 Z"
              fill="#2f461e"
              opacity="0.9"
            />
            <path
              d="M20,350 C80,260 140,270 200,320 C140,310 90,320 20,350 Z"
              fill="#223315"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Right-side Foreground Wheat / Harvest Stalks cluster */}
        <div className="absolute -bottom-8 -right-8 w-[420px] h-[340px] filter drop-shadow-2xl">
          <svg className="w-full h-full animate-crop-sway-slow" viewBox="0 0 420 340" fill="none">
            {/* Right Large Stalk 1 */}
            <path d="M360,340 Q310,180 250,50" stroke="url(#fgWheatGrad1)" strokeWidth="6" strokeLinecap="round" />
            <g transform="translate(250, 50) rotate(-24)">
              <ellipse cx="0" cy="0" rx="9" ry="36" fill="url(#fgWheatEarGrad)" />
              <line x1="-5" y1="-22" x2="-28" y2="-60" stroke="#ffe594" strokeWidth="2" />
              <line x1="0" y1="-32" x2="-4" y2="-75" stroke="#ffe594" strokeWidth="2" />
              <line x1="5" y1="-22" x2="22" y2="-56" stroke="#ffe594" strokeWidth="2" />
              <circle cx="-3" cy="-14" r="3.5" fill="#8f641b" />
              <circle cx="3" cy="-7" r="3.5" fill="#8f641b" />
              <circle cx="-3" cy="3" r="3.5" fill="#8f641b" />
              <circle cx="3" cy="11" r="3.5" fill="#8f641b" />
            </g>

            {/* Right Large Stalk 2 */}
            <path d="M290,340 Q260,200 200,80" stroke="url(#fgWheatGrad1)" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(200, 80) rotate(-16)">
              <ellipse cx="0" cy="0" rx="8" ry="30" fill="url(#fgWheatEarGrad)" />
              <line x1="-4" y1="-18" x2="-22" y2="-52" stroke="#ffe594" strokeWidth="1.8" />
              <line x1="0" y1="-26" x2="-2" y2="-65" stroke="#ffe594" strokeWidth="1.8" />
              <line x1="4" y1="-18" x2="18" y2="-50" stroke="#ffe594" strokeWidth="1.8" />
            </g>

            {/* Foreground Arching Leaf */}
            <path
              d="M340,330 C270,220 190,230 140,280 C190,270 260,280 340,330 Z"
              fill="#2f461e"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Bottom Screen Ground Vignette for natural focus integration */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#140c06]/85 via-[#1b1209]/40 to-transparent pointer-events-none" />
      </motion.div>
    </>
  )
}
