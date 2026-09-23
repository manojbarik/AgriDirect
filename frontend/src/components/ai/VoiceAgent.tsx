import React from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  AlertCircle,
  Globe,
  Loader2,
  Radio,
} from 'lucide-react'
import { useAssistant, type VoiceState } from '../../contexts/useAssistant'

const STATE_CONFIG: Record<
  VoiceState,
  { label: string; color: string; bg: string; iconBg: string }
> = {
  IDLE: {
    label: 'Ready to Listen',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    iconBg: 'bg-emerald-600',
  },
  CONNECTING: {
    label: 'Connecting Voice Engine...',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/30',
    iconBg: 'bg-amber-600',
  },
  LISTENING: {
    label: 'Listening... (Speak naturally)',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/40',
    iconBg: 'bg-red-500 animate-pulse',
  },
  THINKING: {
    label: 'Analyzing Agronomic Context...',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    iconBg: 'bg-cyan-600 animate-spin',
  },
  TOOL_CALL: {
    label: 'Calling AgriDirect Service...',
    color: 'text-purple-300',
    bg: 'bg-purple-500/10 border-purple-500/30',
    iconBg: 'bg-purple-600',
  },
  SPEAKING: {
    label: 'Speaking (Gemini Kore Voice)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-400/50',
    iconBg: 'bg-emerald-500',
  },
  INTERRUPTED: {
    label: 'Interrupted — Processing New Input',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    iconBg: 'bg-amber-600',
  },
  ERROR: {
    label: 'Voice Unavailable — Switch to Text',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
    iconBg: 'bg-rose-600',
  },
}

const LANGUAGES = [
  { code: 'or-IN', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'en-IN', label: 'Indian English' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
]

export const VoiceAgent: React.FC = () => {
  const {
    voiceState,
    voiceSettings,
    setVoiceSettings,
    startVoiceSession,
    stopVoiceSession,
    interruptVoice,
    transcript,
    setActiveTab,
  } = useAssistant()

  const stateCfg = STATE_CONFIG[voiceState]
  const isActive = voiceState === 'LISTENING' || voiceState === 'SPEAKING'

  return (
    <div className="flex flex-col items-center justify-between h-full p-6 text-center text-slate-100">
      {/* Top Bar: Language & Mode */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-1.5 text-xs text-emerald-300">
          <Globe className="h-3.5 w-3.5" />
          <span className="font-medium">Language:</span>
        </div>
        <select
          value={voiceSettings.language}
          onChange={(e) =>
            setVoiceSettings((prev) => ({ ...prev, language: e.target.value }))
          }
          className="text-xs bg-slate-900/90 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-slate-900 text-white">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Center Voice Visualizer */}
      <div className="my-auto flex flex-col items-center gap-6">
        {/* Animated Sound Wave Rings */}
        <div className="relative flex items-center justify-center">
          {isActive && (
            <>
              <div className="absolute h-36 w-36 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
              <div className="absolute h-48 w-48 rounded-full bg-teal-500/10 animate-pulse duration-700" />
            </>
          )}

          <button
            type="button"
            onClick={isActive ? stopVoiceSession : startVoiceSession}
            className={`relative z-10 h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-105 shadow-red-900/60 ring-4 ring-red-400/40'
                : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 hover:scale-105 shadow-emerald-950/80 ring-4 ring-emerald-400/30'
            }`}
            aria-label={isActive ? 'Stop Voice' : 'Start Voice'}
          >
            {isActive ? (
              <Mic className="h-10 w-10 text-white animate-pulse" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </button>
        </div>

        {/* State Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${stateCfg.bg} ${stateCfg.color}`}
        >
          <Radio className="h-3 w-3 animate-pulse" />
          <span>{stateCfg.label}</span>
        </div>

        {/* Live Transcript / Feedback */}
        <div className="w-full max-w-sm min-h-[70px] p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shadow-inner flex flex-col justify-center">
          {transcript ? (
            <p className="italic text-emerald-200">"{transcript}"</p>
          ) : (
            <p className="text-slate-500">
              Tap the microphone to speak. You can speak in Odia, Hindi, English, or Hinglish.
            </p>
          )}
        </div>

        {/* Interruption Button */}
        {voiceState === 'SPEAKING' && (
          <button
            type="button"
            onClick={interruptVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors"
          >
            <Square className="h-3 w-3 fill-amber-300" />
            <span>Interrupt AI Voice</span>
          </button>
        )}
      </div>

      {/* Bottom Switch to Text */}
      <div className="w-full pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Persona: Kore (Female Advisor)</span>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
        >
          Switch to Text Chat →
        </button>
      </div>
    </div>
  )
}
