import React, { useState } from 'react'
import {
  Mic,
  Volume2,
  Square,
  Sparkles,
  Globe,
  Radio,
  Cpu,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { useAssistant, type VoiceState } from '../../contexts/useAssistant'

const STATE_CONFIG: Record<
  VoiceState,
  { label: string; color: string; bg: string; iconBg: string; ringColor: string }
> = {
  IDLE: {
    label: 'Jarvis Ready · Tap Mic or Type',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    iconBg: 'bg-emerald-600',
    ringColor: 'border-emerald-500/30',
  },
  CONNECTING: {
    label: 'Connecting Jarvis Neural Voice Engine...',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/30',
    iconBg: 'bg-amber-600',
    ringColor: 'border-amber-500/30',
  },
  LISTENING: {
    label: 'Listening... Speak naturally in your language',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border-rose-500/40',
    iconBg: 'bg-rose-500 animate-pulse',
    ringColor: 'border-rose-500/40',
  },
  THINKING: {
    label: 'Jarvis Analyzing AgriDirect Context...',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    iconBg: 'bg-cyan-600 animate-spin',
    ringColor: 'border-cyan-500/30',
  },
  TOOL_CALL: {
    label: 'Executing AgriDirect Service...',
    color: 'text-purple-300',
    bg: 'bg-purple-500/10 border-purple-500/30',
    iconBg: 'bg-purple-600',
    ringColor: 'border-purple-500/30',
  },
  SPEAKING: {
    label: 'Jarvis Speaking · Spoken Answer Live',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-400/50',
    iconBg: 'bg-emerald-500',
    ringColor: 'border-emerald-400/50',
  },
  INTERRUPTED: {
    label: 'Interrupted — Ready for New Query',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    iconBg: 'bg-amber-600',
    ringColor: 'border-amber-500/30',
  },
  ERROR: {
    label: 'Voice Unavailable — Switch to Text Chat',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
    iconBg: 'bg-rose-600',
    ringColor: 'border-rose-500/30',
  },
}

const LANGUAGES = [
  { code: 'or-IN', label: 'Odia (ଓଡ଼ିଆ)', sample: 'ଆଜି ଧାନ ଦର କେତେ?' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)', sample: 'आज गेहूँ का भाव क्या है?' },
  { code: 'en-IN', label: 'Indian English', sample: "What is today's tomato price?" },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)', sample: 'ਅੱਜ ਕਣਕ ਦਾ ਰੇਟ ਕੀ ਹੈ?' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)', sample: 'ఈరోజు మార్కెట్ ధర ఎంత?' },
]

export const VoiceAgent: React.FC = () => {
  const {
    voiceState,
    voiceSettings,
    setVoiceSettings,
    startVoiceSession,
    stopVoiceSession,
    interruptVoice,
    sendVoiceQuery,
    transcript,
    setActiveTab,
  } = useAssistant()

  const [textInput, setTextInput] = useState('')

  const stateCfg = STATE_CONFIG[voiceState]
  const isActive = voiceState === 'LISTENING' || voiceState === 'SPEAKING'
  const isSpeaking = voiceState === 'SPEAKING'
  const isListening = voiceState === 'LISTENING'
  const isThinking = voiceState === 'THINKING'

  // Detect whether SpeechRecognition is available in this browser
  const isSttSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const handleQuickPrompt = (promptText: string) => {
    sendVoiceQuery(promptText)
  }

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = textInput.trim()
    if (!q) return
    setTextInput('')
    sendVoiceQuery(q)
  }

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 sm:p-5 text-center text-slate-100 overflow-y-auto space-y-4">
      {/* Top Bar: Language & Jarvis Neural Status */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-1.5 text-xs text-emerald-300">
          <Globe className="h-3.5 w-3.5" />
          <span className="font-semibold">Speech Language:</span>
        </div>
        <select
          value={voiceSettings.language}
          onChange={(e) =>
            setVoiceSettings((prev) => ({ ...prev, language: e.target.value }))
          }
          className="text-xs bg-slate-900/90 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-medium cursor-pointer shadow-inner"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-slate-900 text-white">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advisory banner for browsers without STT (e.g., iOS Safari) */}
      {!isSttSupported && (
        <div className="w-full bg-amber-950/60 border border-amber-600/40 rounded-xl px-3 py-2 flex items-start gap-2 text-left">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200 leading-snug">
            Mic speech input is not supported on this browser. Type below or tap a question — Jarvis will speak the reply!
          </p>
        </div>
      )}

      {/* Center Jarvis Voice Core Visualizer */}
      <div className="my-auto py-3 flex flex-col items-center gap-4 w-full">
        {/* Animated Sound Wave Rings */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Aura */}
          {isActive && (
            <>
              <div className="absolute h-40 w-40 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
              <div className="absolute h-52 w-52 rounded-full bg-teal-500/10 animate-pulse duration-700" />
            </>
          )}

          {/* Concentric HUD Rings */}
          <div
            className={`absolute h-32 w-32 rounded-full border border-dashed transition-all duration-700 ${
              isSpeaking
                ? 'border-emerald-400 animate-spin'
                : isListening
                ? 'border-rose-400/60 animate-pulse scale-110'
                : 'border-emerald-500/20'
            }`}
          />

          {/* Main Voice Activation Button */}
          <button
            type="button"
            onClick={
              isSpeaking
                ? interruptVoice
                : isActive
                ? stopVoiceSession
                : startVoiceSession
            }
            className={`relative z-10 h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${
              isListening
                ? 'bg-gradient-to-br from-rose-500 to-red-600 scale-110 shadow-red-950/80 ring-4 ring-rose-400/40 animate-pulse'
                : isSpeaking
                ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 scale-105 shadow-emerald-950/80 ring-4 ring-emerald-400/50'
                : isThinking
                ? 'bg-gradient-to-br from-cyan-600 to-teal-700 scale-105 ring-4 ring-cyan-400/30'
                : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 hover:scale-105 shadow-emerald-950/80 ring-4 ring-emerald-400/30'
            }`}
            aria-label={isSpeaking ? 'Interrupt Voice' : isActive ? 'Stop Voice' : 'Start Voice'}
            title={
              isSpeaking
                ? 'Tap to Interrupt Jarvis'
                : isActive
                ? 'Stop Voice Session'
                : 'Start Speaking to Jarvis'
            }
          >
            {isListening ? (
              <Mic className="h-10 w-10 text-white animate-bounce" />
            ) : isSpeaking ? (
              <Volume2 className="h-10 w-10 text-white animate-pulse" />
            ) : isThinking ? (
              <Sparkles className="h-10 w-10 text-cyan-200 animate-spin" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </button>
        </div>

        {/* Audio Equalizer Bars Animation */}
        {isActive && (
          <div className="flex items-center gap-1.5 h-5">
            {[40, 75, 100, 60, 90, 45, 80, 50, 95, 30].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isListening ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
                style={{
                  height: `${Math.max(6, (h * Math.sin(Date.now() / 200 + i)) % 20)}px`,
                  animation: `pulse ${(i % 3) * 0.2 + 0.4}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        {/* State Status Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm ${stateCfg.bg} ${stateCfg.color}`}
        >
          <Radio className="h-3 w-3 animate-pulse" />
          <span>{stateCfg.label}</span>
        </div>

        {/* Live Transcript Display */}
        <div className="w-full max-w-sm min-h-[75px] p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/20 text-xs text-slate-200 shadow-inner flex flex-col justify-center transition-all">
          {transcript ? (
            <p className="italic text-emerald-200 leading-relaxed">"{transcript}"</p>
          ) : (
            <p className="text-slate-400 leading-relaxed">
              Tap the microphone to speak with Jarvis, or type your question below. Works in Odia, Hindi, and English.
            </p>
          )}
        </div>

        {/* Interruption Control Button */}
        {isSpeaking && (
          <button
            type="button"
            onClick={interruptVoice}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors shadow-sm active:scale-95"
          >
            <Square className="h-3 w-3 fill-amber-300" />
            <span>Interrupt Voice</span>
          </button>
        )}

        {/* Always-Available Inline Dual Input (for PC & Mobile) */}
        <form onSubmit={handleTextSubmit} className="w-full max-w-sm flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              voiceSettings.language.startsWith('or')
                ? 'ପ୍ରଶ୍ନ ଟାଇପ୍ କରନ୍ତୁ...'
                : voiceSettings.language.startsWith('hi')
                ? 'सवाल टाइप करें...'
                : 'Type your question...'
            }
            className="flex-1 bg-slate-900/90 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Ask Jarvis"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Quick Voice Topics Bar */}
        <div className="w-full max-w-sm pt-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-left">
            Suggested Jarvis Queries:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPrompt(
                voiceSettings.language.startsWith('or')
                  ? 'ଆଜି ଧାନର ମଣ୍ଡି ଦର କେତେ?'
                  : voiceSettings.language.startsWith('hi')
                  ? 'आज गेहूँ का मंडी भाव क्या है?'
                  : "What is today's paddy mandi rate?"
              )}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900 border border-emerald-500/25 hover:border-emerald-400 text-emerald-200 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              🌾 {voiceSettings.language.startsWith('or') ? 'ଧାନ ଦର' : voiceSettings.language.startsWith('hi') ? 'गेहूँ भाव' : 'Paddy Price'}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt(
                voiceSettings.language.startsWith('or')
                  ? "ଭୁବନେଶ୍ୱରରେ ଆଜି ଆବହାୱା କ'ଣ?"
                  : 'What is the weather forecast for today?'
              )}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900 border border-emerald-500/25 hover:border-emerald-400 text-emerald-200 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              🌧️ {voiceSettings.language.startsWith('or') ? 'ଆବହାୱା' : 'Weather'}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt(
                voiceSettings.language.startsWith('or')
                  ? 'ମୋ ଫସଲ ପାଇଁ କ୍ରେତା ଖୋଜ'
                  : 'Find buyers for my harvest'
              )}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900 border border-emerald-500/25 hover:border-emerald-400 text-emerald-200 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              🚜 {voiceSettings.language.startsWith('or') ? 'କ୍ରେତା ଖୋଜ' : 'Find Buyers'}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt(
                voiceSettings.language.startsWith('or')
                  ? "ତୁମେ କିଏ? ତୁମ ପରିଚୟ କ'ଣ?"
                  : 'Who are you and what is Jarvis?'
              )}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              🤖 {voiceSettings.language.startsWith('or') ? 'ଜାର୍ଭିସ କିଏ' : 'About Jarvis'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Switch to Text Chat */}
      <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1 text-[11px] text-emerald-300/80">
          <Cpu className="h-3.5 w-3.5 text-emerald-400" />
          <span>Jarvis Voice v2.4 (PC & Mobile)</span>
        </span>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
        >
          Switch to Text Chat →
        </button>
      </div>
    </div>
  )
}
