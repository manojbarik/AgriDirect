import React from 'react'
import { motion, MotionValue } from 'framer-motion'

interface FarmerFigureProps {
  farmerY?: MotionValue<number>
  farmerX?: MotionValue<number>
  timeOfDay?: 'golden' | 'day' | 'twilight' | 'night'
}

export const FarmerFigure: React.FC<FarmerFigureProps> = ({
  farmerY,
  farmerX,
  timeOfDay = 'golden',
}) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none select-none z-20"
      style={{ x: farmerX, y: farmerY }}
    >
      {/* Positioned inside the agricultural field on the mid-right / right-center perspective row */}
      <div className="absolute bottom-[16%] right-[14%] sm:right-[18%] md:right-[22%] lg:right-[26%] w-72 sm:w-80 md:w-96 h-[340px] sm:h-[380px] md:h-[420px]">
        {/* Environmental Cast Shadow on the soil plane */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-[42%] w-56 h-12 rounded-[100%] blur-md opacity-75 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(14, 8, 4, 0.85) 0%, rgba(26, 16, 9, 0.5) 55%, transparent 80%)',
            transform: 'rotate(-4deg) skewX(-20deg)',
          }}
        />

        {/* Ambient atmospheric haze behind farmer */}
        <div
          className="absolute -top-10 -left-10 -right-10 -bottom-10 rounded-full blur-2xl opacity-40 pointer-events-none"
          style={{
            background:
              timeOfDay === 'golden'
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.1) 60%, transparent 85%)'
                : timeOfDay === 'day'
                ? 'radial-gradient(circle, rgba(254, 240, 138, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, transparent 70%)',
          }}
        />

        {/* ================= VECTOR FARMER FIGURE (CRAFTED SILHOUETTE WITH NATURAL LIGHTING) ================= */}
        <motion.svg
          className="w-full h-full filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]"
          viewBox="0 0 320 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0.95 }}
          animate={{
            y: [0, -3, 0, -2, 0],
            rotate: [0, -0.6, 0.4, -0.4, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <defs>
            {/* Sun Rim Light Gradient along the farmer's back/hat */}
            <linearGradient id="sunRimLight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor={
                  timeOfDay === 'golden'
                    ? '#fef08a'
                    : timeOfDay === 'day'
                    ? '#ffffff'
                    : '#fed7aa'
                }
                stopOpacity="0.95"
              />
              <stop offset="35%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#451a03" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#18120c" stopOpacity="1" />
            </linearGradient>

            {/* Farmer Clothing Tone (Tunic / Kurta) */}
            <linearGradient id="farmerTunicGrad" x1="75%" y1="15%" x2="25%" y2="85%">
              <stop offset="0%" stopColor="#d4a359" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#8c5825" />
              <stop offset="85%" stopColor="#3b220e" />
              <stop offset="100%" stopColor="#1f1107" />
            </linearGradient>

            {/* Farmer Hat / Pagdi */}
            <linearGradient id="farmerHatGrad" x1="80%" y1="0%" x2="20%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Farmer Dhoti / Lower Garment */}
            <linearGradient id="farmerDhotiGrad" x1="70%" y1="10%" x2="30%" y2="90%">
              <stop offset="0%" stopColor="#e2d4be" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#968571" />
              <stop offset="90%" stopColor="#2b2016" />
              <stop offset="100%" stopColor="#16100b" />
            </linearGradient>

            {/* Crop Stalk in Hand */}
            <linearGradient id="stalkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#3f6212" />
            </linearGradient>
          </defs>

          {/* ================= LOWER LEGS & DHOTI (EMBEDDED IN FIELD SOIL) ================= */}
          <g id="farmer-lower-body">
            {/* Left Leg / Dhoti fold */}
            <path
              d="M138,270 C134,295 130,330 128,370 C136,372 148,371 154,368 C153,332 154,298 156,270 Z"
              fill="url(#farmerDhotiGrad)"
            />
            {/* Right Leg / Forward stance Dhoti fold */}
            <path
              d="M165,270 C168,295 174,330 180,366 C188,368 200,365 204,360 C196,328 188,295 182,270 Z"
              fill="url(#farmerDhotiGrad)"
            />
            {/* Main Dhoti wrap & pleats */}
            <path
              d="M125,190 C120,215 124,255 132,275 C145,282 175,282 192,273 C198,252 202,215 198,190 Z"
              fill="url(#farmerDhotiGrad)"
            />
            {/* Cloth shadow creases */}
            <path
              d="M152,195 Q148,235 146,275"
              stroke="#1b120a"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M168,198 Q172,238 175,272"
              stroke="#1b120a"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.75"
            />
          </g>

          {/* ================= TORSO & TUNIC (GENTLE BENDING POSTURE) ================= */}
          <motion.g
            id="farmer-torso"
            animate={{
              rotate: [0, -1, 0.5, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '160px 190px' }}
          >
            {/* Back curvature & main torso */}
            <path
              d="M132,118 C124,140 122,168 126,192 C148,198 178,198 196,190 C194,164 190,138 184,116 C168,112 148,112 132,118 Z"
              fill="url(#farmerTunicGrad)"
            />

            {/* Sun Rim Highlight on left shoulder/back */}
            <path
              d="M132,118 C125,138 123,165 126,190"
              stroke={timeOfDay === 'golden' ? '#fef08a' : '#ffffff'}
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Waist Sash / Cloth belt */}
            <path
              d="M125,185 C142,192 180,192 198,185 C196,194 178,202 125,195 Z"
              fill="#b45309"
              opacity="0.9"
            />
            <path
              d="M174,192 C178,210 182,230 184,242 C178,242 174,235 171,215 Z"
              fill="#92400e"
              opacity="0.85"
            />

            {/* Left Arm (Resting on hip or supporting harvest basket) */}
            <path
              d="M132,122 C118,142 110,165 116,188 C120,192 128,188 132,180 C128,162 134,145 142,130 Z"
              fill="url(#farmerTunicGrad)"
            />
            {/* Left Hand */}
            <circle cx="120" cy="190" r="7" fill="#8c5825" />

            {/* ================= RIGHT WORKING ARM (TENDING / CHECKING CROP) ================= */}
            <motion.g
              id="farmer-working-arm"
              animate={{
                rotate: [0, 2.5, -1.5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '180px 124px' }}
            >
              {/* Upper right arm */}
              <path
                d="M182,122 C196,138 214,152 230,168 C226,174 218,174 206,162 C194,148 184,136 178,126 Z"
                fill="url(#farmerTunicGrad)"
              />
              {/* Forearm extending down towards the crop row */}
              <path
                d="M228,166 C236,182 242,202 245,224 C239,226 232,224 226,206 C222,190 218,178 214,168 Z"
                fill="#8c5825"
              />
              {/* Working Hand holding grain stalk */}
              <circle cx="245" cy="226" r="6.5" fill="#a16207" />
              {/* Crop Stalk held in hand */}
              <path
                d="M245,226 Q252,200 258,178"
                stroke="url(#stalkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <ellipse
                cx="258"
                cy="176"
                rx="4"
                ry="12"
                fill="#eab308"
                transform="rotate(18 258 176)"
              />
            </motion.g>

            {/* Neck & Profile */}
            <path
              d="M152,106 C150,116 152,122 154,126 C162,126 166,122 168,106 Z"
              fill="#8c5825"
            />
            {/* Head profile / jaw */}
            <ellipse cx="160" cy="98" rx="14" ry="16" fill="#8c5825" />

            {/* ================= TRADITIONAL FARMER HAT / PAGDI ================= */}
            <g id="farmer-hat">
              {/* Wide woven brim */}
              <ellipse
                cx="158"
                cy="92"
                rx="34"
                ry="12"
                fill="url(#farmerHatGrad)"
                transform="rotate(-8 158 92)"
              />
              {/* Conical / Crown top */}
              <path
                d="M136,88 Q156,58 176,82 Z"
                fill="url(#farmerHatGrad)"
              />
              {/* Rim light along top edge of the hat */}
              <path
                d="M132,88 Q156,58 180,82"
                stroke={timeOfDay === 'golden' ? '#fef08a' : '#ffffff'}
                strokeWidth="2.5"
                fill="none"
                opacity="0.9"
              />
              {/* Shadow under brim cast on face */}
              <path
                d="M138,94 Q158,98 178,92 C174,104 146,104 138,94 Z"
                fill="#1f1107"
                opacity="0.8"
              />
            </g>
          </motion.g>

          {/* ================= IN-FRONT SOIL & CROP MESH OVER ANKLES ================= */}
          {/* This explicitly plants the farmer's legs deep into the furrow so there's zero float */}
          <g id="ground-overlap-crop">
            <path
              d="M110,380 Q160,360 220,380 L220,400 L110,400 Z"
              fill="#26190f"
            />
            {/* Overlapping small crop stalks at his feet */}
            <path
              d="M120,385 Q125,355 128,338"
              stroke="#556b2f"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M142,388 Q148,360 145,342"
              stroke="#6b8e23"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M175,385 Q172,352 178,335"
              stroke="#556b2f"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M195,388 Q202,362 205,346"
              stroke="#7c9f35"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </motion.svg>
      </div>
    </motion.div>
  )
}
