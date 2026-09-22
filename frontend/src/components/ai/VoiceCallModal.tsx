import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Bot,
  Activity,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { assistantVoice, type AssistantHistoryItem } from '../../api/ai'

interface VoiceCallModalProps {
  isOpen: boolean
  onClose: () => void
}

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'en-IN', label: 'Indian English' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
]

// SpeechRecognition type shim for browsers
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : unknown

function getSpeechRecognition(): SpeechRecognitionType | null {
  const w = window as unknown as Record<string, unknown>
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  return (SR as SpeechRecognitionType) ?? null
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ isOpen, onClose }) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening'>('connecting')
  const [isMuted, setIsMuted] = useState(false)
  const [selectedLang, setSelectedLang] = useState('hi-IN')
  const [transcript, setTranscript] = useState<string>('Connecting to AgriDirect AI Voice Hotline...')
  const [seconds, setSeconds] = useState(0)
  const conversationRef = useRef<AssistantHistoryItem[]>([])
  const recognitionRef = useRef<ReturnType<typeof Object.create> | null>(null)

  // Cleanup speech synthesis and recognition on close
  const cleanup = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setSeconds(0)
      setCallStatus('connecting')
      conversationRef.current = []
      return
    }

    const timer = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    // Simulate call connect
    const connectTimeout = setTimeout(() => {
      setCallStatus('speaking')
      const welcomeText =
        selectedLang.startsWith('hi')
          ? 'नमस्ते किसान साथी! एग्रीडायरेक्ट AI वॉयस हेल्पलाइन में आपका स्वागत है। आप अपनी फसल, कीट नियंत्रण या बाज़ार भाव के बारे में पूछ सकते हैं।'
          : 'Namaste farmer! Welcome to AgriDirect AI Voice Hotline. How can I assist you with your crops or livestock today?'
      setTranscript(welcomeText)

      // Speak the welcome using browser TTS
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(welcomeText)
          utterance.lang = selectedLang
          utterance.onend = () => {
            setCallStatus('listening')
            setTranscript(
              selectedLang.startsWith('hi')
                ? 'सुन रहा हूँ... बोलिए (उदाहरण: टमाटर में कीड़ा लगा है या गेहूँ का भाव क्या है?)'
                : 'Listening... (Speak your question, e.g. What is the current wheat price or tomato treatment?)'
            )
            startListening()
          }
          window.speechSynthesis.speak(utterance)
        } catch {
          // Fallback if speech synthesis restricted
          setTimeout(() => {
            setCallStatus('listening')
            startListening()
          }, 3000)
        }
      } else {
        setTimeout(() => {
          setCallStatus('listening')
        }, 3000)
      }
    }, 1500)

    return () => {
      clearInterval(timer)
      clearTimeout(connectTimeout)
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLang])

  // Start listening using browser SpeechRecognition API
  const startListening = useCallback(() => {
    const SRClass = getSpeechRecognition()
    if (!SRClass) return // Browser doesn't support speech recognition

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SRClass as any)()
      recognition.lang = selectedLang
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event: { results: { transcript: string; isFinal: boolean }[][] }) => {
        const result = event.results[event.results.length - 1]
        if (result && result[0]) {
          const spokenText = result[0].transcript
          if (result[0].isFinal) {
            handleVoiceQuery(spokenText)
          } else {
            setTranscript(`🎤 ${spokenText}...`)
          }
        }
      }

      recognition.onerror = () => {
        setCallStatus('listening')
      }

      recognition.onend = () => {
        // Auto-restart if still in listening mode and not muted
        if (!isMuted) {
          // Don't auto-restart immediately — wait for AI response
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      // Speech recognition not available in this browser
    }
  }, [selectedLang, isMuted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Send voice query to backend and speak response
  const handleVoiceQuery = useCallback(async (question: string) => {
    setCallStatus('speaking')
    setTranscript(`You: "${question}"\n\n⏳ Getting AI response...`)

    conversationRef.current.push({ role: 'user', text: question })

    let aiReply: string
    try {
      const response = await assistantVoice({
        message: question,
        conversation_history: conversationRef.current.slice(-10),
        context: {},
      })
      aiReply = response.data.reply
    } catch {
      // Fallback for voice
      aiReply = selectedLang.startsWith('hi')
        ? 'माफ़ करें, AI सेवा अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'
        : 'Sorry, AI service is currently unavailable. Please try again later.'
    }

    conversationRef.current.push({ role: 'model', text: aiReply })
    setTranscript(`You: "${question}"\n\nAI: "${aiReply}"`)

    // Speak the AI response
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(aiReply)
        utterance.lang = selectedLang
        utterance.onend = () => {
          setCallStatus('listening')
          startListening()
        }
        window.speechSynthesis.speak(utterance)
      } catch {
        setTimeout(() => {
          setCallStatus('listening')
          startListening()
        }, 2000)
      }
    } else {
      setTimeout(() => {
        setCallStatus('listening')
      }, 3000)
    }
  }, [selectedLang, startListening])

  if (!isOpen) return null

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const handleSimulateQuestion = (q: string) => {
    // Use the real backend instead of hardcoded answers
    handleVoiceQuery(q)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="AgriDirect Voice AI Hotline">
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        {/* Call header */}
        <div className="flex items-center justify-between w-full px-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
            <span>{callStatus === 'connecting' ? 'CONNECTING...' : 'LIVE CALL'}</span>
          </div>

          <span className="font-mono text-slate-300 font-medium">{formatTime(seconds)}</span>

          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Animated Avatar / Audio Waves */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`absolute w-36 h-36 rounded-full transition-all duration-700 ${
              callStatus === 'speaking'
                ? 'bg-emerald-500/20 scale-125 animate-ping'
                : callStatus === 'listening'
                ? 'bg-teal-500/20 scale-110 animate-pulse'
                : 'bg-slate-800/20'
            }`}
          />
          <div
            className={`h-24 w-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 z-10 ${
              callStatus === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/50 scale-105'
                : callStatus === 'listening'
                ? 'bg-gradient-to-tr from-teal-600 to-emerald-600 shadow-teal-500/40'
                : 'bg-slate-800'
            }`}
          >
            {callStatus === 'speaking' ? (
              <Volume2 className="h-10 w-10 animate-bounce" />
            ) : callStatus === 'listening' ? (
              <Mic className="h-10 w-10 animate-pulse" />
            ) : (
              <Bot className="h-10 w-10 text-slate-400" />
            )}
          </div>
        </div>

        {/* Status text & transcript */}
        <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 min-h-[110px] flex items-center justify-center text-left">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line text-center">
            {transcript}
          </p>
        </div>

        {/* Quick sample speech topics — now calls real backend */}
        <div className="w-full text-left space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tap to Ask Voice Query:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSimulateQuestion("What is today's wheat rate in Punjab?")}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 transition-colors"
            >
              🌾 Wheat Mandi Rate
            </button>
            <button
              type="button"
              onClick={() => handleSimulateQuestion('How to prevent fungus in tomato leaves?')}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 transition-colors"
            >
              🍅 Tomato Fungus Care
            </button>
            <button
              type="button"
              onClick={() => handleSimulateQuestion('When will it rain in Bhubaneswar, Odisha?')}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 transition-colors"
            >
              🌧️ Rain Forecast
            </button>
          </div>
        </div>

        {/* Call control action buttons */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              cleanup()
              onClose()
            }}
            className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Modal>
  )
}
