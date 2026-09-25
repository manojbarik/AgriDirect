import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Bot,
  Activity,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { assistantVoice, assistantAudio, type AssistantHistoryItem } from '../../api/ai'

interface VoiceCallModalProps {
  isOpen: boolean
  onClose: () => void
}

const LANGUAGES = [
  { code: 'or-IN', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'en-IN', label: 'Indian English' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
]

function toPhoneticOdia(text: string): string {
  if (!/[\u0B00-\u0B7F]/.test(text)) return text

  // Map full Odia words/phrases to phonetic equivalents.
  // IMPORTANT: list LONGEST strings first so partial chars like 'ର' don't
  // accidentally match inside longer words (which caused "ra ra" artifacts).
  const map: [string, string][] = [
    ['ଆଗ୍ରୀଡାଇରେକ୍ଟ', 'AgriDirect'],
    ['ବିଶ୍ୱସନୀୟତା', 'biswasaniyata'],
    ['ଅଭିନାଶଙ୍କ', 'Abhinash ka'],
    ['ସମ୍ପର୍କିତ', 'samparkita'],
    ['ଉପସ୍ଥିତ', 'upasthita'],
    ['ନମସ୍କାର', 'Namaskar'],
    ['କିଲୋଗ୍ରାମ', 'kilogram'],
    ['ନିୟନ୍ତ୍ରଣ', 'niyantrana'],
    ['ଆନୁମାନିକ', 'anumanika'],
    ['ସିଞ୍ଚନ', 'sinchana'],
    ['ନିର୍ମିତ', 'nirmita'],
    ['ପାଣିପାଗ', 'panipaga'],
    ['ଆବହାୱା', 'abahawa'],
    ['ପରାମର୍ଶ', 'paramarsha'],
    ['ଜାର୍ଭିସ', 'Jarvis'],
    ['ଦ୍ୱାରା', 'dwara'],
    ['ସହାୟକ', 'sahayak'],
    ['ସମସ୍ତ', 'samasta'],
    ['କରନ୍ତୁ', 'karantu'],
    ['ହୋଇଛି', 'hoichi'],
    ['ଓଡ଼ିଶା', 'Odisha'],
    ['ବନ୍ଧୁ', 'bandhu'],
    ['ଟମାଟୋ', 'tomato'],
    ['ଯାଞ୍ଚ', 'jancha'],
    ['ଚାଷୀ', 'chashi'],
    ['ସେବା', 'seba'],
    ['ମଣ୍ଡି', 'mandi'],
    ['ଧାନ', 'dhana'],
    ['ଗହମ', 'gaham'],
    ['ଏବଂ', 'ebang'],
    ['ଫସଲ', 'fasal'],
    ['ବଜାର', 'bajar'],
    ['ଆଳୁ', 'alu'],
    ['ପିଆଜ', 'piaj'],
    ['ପ୍ରତି', 'prati'],
    ['ପାଣି', 'pani'],
    ['ପାଇଁ', 'paaeen'],
    ['ତେଲ', 'tel'],
    ['ଦର', 'dara'],
    ['ମୁଁ', 'Mu'],
    ['ଆଜି', 'Aji'],
    ['କୀଟ', 'kit'],
  ]

  let str = text
  for (const [k, v] of map) {
    str = str.split(k).join(v)
  }
  // Strip any remaining unmapped Odia characters silently (no "ra" noise)
  return str.replace(/[\u0B00-\u0B7F]+/g, '').replace(/\s{2,}/g, ' ').trim()
}


// ─── Mobile / browser detection helpers ─────────────────────────────────────

/** True when running inside a mobile browser (iOS, Android, etc.) */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 0)
}

/** True when SpeechRecognition (STT) is available */
function hasSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as Record<string, unknown>
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

function getSpeechRecognition(): unknown {
  const w = window as unknown as Record<string, unknown>
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/** Get voices with a fallback that waits for the async voiceschanged event (mobile) */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([])
      return
    }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }
    // On mobile browsers, voices load asynchronously
    const onReady = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onReady)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', onReady)
    // Safety timeout — if voiceschanged never fires (rare edge case)
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onReady)
      resolve(window.speechSynthesis.getVoices())
    }, 2000)
  })
}


export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ isOpen, onClose }) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening'>('connecting')
  const [isMuted, setIsMuted] = useState(false)
  const [selectedLang, setSelectedLang] = useState('or-IN')
  const [transcript, setTranscript] = useState<string>('AgriDirect Jarvis ସହ ସଂଯୋଗ ହେଉଛି...')
  const [seconds, setSeconds] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [sttSupported, setSttSupported] = useState(true)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const isSpeakerMutedRef = useRef(false)
  isSpeakerMutedRef.current = isSpeakerMuted
  const conversationRef = useRef<AssistantHistoryItem[]>([])
  const recognitionRef = useRef<ReturnType<typeof Object.create> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const isMobile = useRef(isMobileDevice())

  // Cleanup speech synthesis, recognition, and media recorder on close
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null
    }
    setIsRecordingAudio(false)
  }, [])

  // Speak text using preloaded voices (mobile-safe)
  const speakTextMobile = useCallback(
    (text: string, onDone?: () => void) => {
      if (!('speechSynthesis' in window) || isSpeakerMutedRef.current) {
        onDone?.()
        return
      }

      try {
        window.speechSynthesis.cancel()
        const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices()
        const langCode = selectedLang.slice(0, 2).toLowerCase()
        const nativeVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langCode))

        // If native Odia voice is not installed, convert to phonetic text
        const spokenText = selectedLang.startsWith('or') && !nativeVoice ? toPhoneticOdia(text) : text
        const utterance = new SpeechSynthesisUtterance(spokenText)
        utterance.lang = nativeVoice ? selectedLang : (selectedLang.startsWith('or') ? 'hi-IN' : selectedLang)
        utterance.rate = isMobile.current ? 0.88 : 0.96
        utterance.pitch = 1.02

        const preferredVoice =
          nativeVoice ||
          voices.find(
            (v) =>
              v.lang.toLowerCase().includes('in') &&
              (v.name.toLowerCase().includes('google') ||
                v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('online'))
          ) ||
          voices.find((v) => v.lang.toLowerCase().includes('in') || v.name.toLowerCase().includes('india')) ||
          null

        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        utterance.onend = () => onDone?.()
        utterance.onerror = () => onDone?.()

        // iOS Safari workaround: speech synthesis needs to stay alive
        // by periodically calling resume() to prevent it from pausing
        window.speechSynthesis.speak(utterance)

        if (isMobile.current) {
          const keepAlive = setInterval(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause()
              window.speechSynthesis.resume()
            } else {
              clearInterval(keepAlive)
            }
          }, 5000)
        }
      } catch {
        onDone?.()
      }
    },
    [selectedLang]
  )

  // Process audio blob recording from MediaRecorder
  const handleAudioBlobQuery = useCallback(
    async (blob: Blob) => {
      setCallStatus('speaking')
      setTranscript(
        selectedLang.startsWith('or')
          ? '⏳ ଜାର୍ଭିସ ଆପଣଙ୍କ ସ୍ୱର ଶୁଣୁଛି...'
          : selectedLang.startsWith('hi')
          ? '⏳ जार्विस आपकी आवाज़ सुन रहा है...'
          : '⏳ Jarvis analyzing your voice message...'
      )

      try {
        const response = await assistantAudio(blob, selectedLang, 'FARMER', 'Odisha')
        const aiReply = response.data.reply
        conversationRef.current.push({ role: 'user', text: '[Voice Query]' })
        conversationRef.current.push({ role: 'model', text: aiReply })
        setTranscript(`Jarvis: "${aiReply}"`)

        speakTextMobile(aiReply, () => {
          setCallStatus('listening')
        })
      } catch {
        const errorMsg =
          selectedLang.startsWith('or')
            ? 'ମାଫ କରନ୍ତୁ, ଅଡିଓ ବୁଝିବାରେ ସମସ୍ୟା ହେଲା। ଦୟାକରି ତଳେ ଟାଇପ୍ କରନ୍ତୁ।'
            : selectedLang.startsWith('hi')
            ? 'माफ़ करें, आवाज़ समझने में समस्या हुई। कृपया नीचे टाइप करें।'
            : 'Could not process voice recording. Please type your question below.'
        setTranscript(errorMsg)
        setCallStatus('listening')
      }
    },
    [selectedLang, speakTextMobile]
  )

  // MediaRecorder audio capture for mobile APK, WebViews, and Safari
  const startMediaRecording = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setTranscript('Microphone access is not supported. Please type your question below.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      audioChunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mr.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          handleAudioBlobQuery(blob)
        }
        setIsRecordingAudio(false)
      }

      mr.start(250)
      setIsRecordingAudio(true)
      setCallStatus('listening')
      setTranscript(
        selectedLang.startsWith('or')
          ? '🎙️ ଶୁଣୁଛି... କହି ସାରିଲେ ମାଇକ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ।'
          : selectedLang.startsWith('hi')
          ? '🎙️ सुन रहा हूँ... बोलने के बाद माइक दबाएं।'
          : '🎙️ Recording voice... Tap mic when finished speaking.'
      )
    } catch {
      setTranscript(
        '🔒 Microphone permission needed. Please allow microphone in settings or type below.'
      )
      setCallStatus('listening')
    }
  }, [selectedLang, handleAudioBlobQuery])

  const stopMediaRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    setIsRecordingAudio(false)
  }, [])

  const startListeningRef = useRef<() => void>(() => {})

  // Send voice/text query to backend and speak response
  const handleVoiceQuery = useCallback(async (question: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

    setCallStatus('speaking')
    setTranscript(`You: "${question}"\n\n⏳ Getting Jarvis AI response...`)

    conversationRef.current.push({ role: 'user', text: question })

    let aiReply: string
    try {
      const response = await assistantVoice({
        message: question,
        conversation_history: conversationRef.current.slice(-10),
        context: {
          output_format: 'spoken_response',
          language: selectedLang,
          user_language: selectedLang.startsWith('or') ? 'odia' : selectedLang.startsWith('hi') ? 'hindi' : 'english',
        },
      })
      aiReply = response.data.reply
    } catch {
      aiReply = selectedLang.startsWith('or')
        ? 'ମାଫ କରନ୍ତୁ, AI ସେବା ବର୍ତ୍ତମାନ ଉପଲବ୍ଧ ନୁହଁ। ଟିକେ ପରେ ଚେଷ୍ଟା କରନ୍ତୁ।'
        : selectedLang.startsWith('hi')
        ? 'माफ़ करें, AI सेवा अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'
        : 'Sorry, AI service is currently unavailable. Please try again later.'
    }

    conversationRef.current.push({ role: 'model', text: aiReply })
    setTranscript(`You: "${question}"\n\nJarvis: "${aiReply}"`)

    // Speak the AI response, then go back to listening
    speakTextMobile(aiReply, () => {
      setCallStatus('listening')
      if (!isMuted) {
        startListeningRef.current()
      } else {
        setTranscript(
          selectedLang.startsWith('or')
            ? '⌨️ ଆପଣଙ୍କ ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ବଟନ୍ ଦବାନ୍ତୁ...'
            : selectedLang.startsWith('hi')
            ? '⌨️ अपना अगला सवाल टाइप करें या बटन दबाएं...'
            : '⌨️ Type your next question or tap a quick topic...'
        )
      }
    })
  }, [selectedLang, isMuted, speakTextMobile])

  // Start listening using browser SpeechRecognition API, with MediaRecorder fallback
  const startListening = useCallback(() => {
    if (isMuted) return
    const SRClass = getSpeechRecognition()
    if (!SRClass) {
      startMediaRecording()
      return
    }

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

      recognition.onerror = (ev: { error: string }) => {
        // In Android WebView, recognition fails with not-allowed or service-not-allowed
        // Gracefully fall back to MediaRecorder!
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'network') {
          startMediaRecording()
        } else {
          setCallStatus('listening')
        }
      }

      recognition.onend = () => {
        // Recognition cycle completed
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      startMediaRecording()
    }
  }, [selectedLang, isMuted, startMediaRecording, handleVoiceQuery])

  startListeningRef.current = startListening

  // Interrupt Jarvis speaking immediately
  const handleInterrupt = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (isRecordingAudio) {
      stopMediaRecording()
    }
    setCallStatus('listening')
    setTranscript(
      selectedLang.startsWith('or')
        ? 'ଆପଣ କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ, ଜାର୍ଭିସ ଶୁଣୁଛି...'
        : selectedLang.startsWith('hi')
        ? 'बोलिए या टाइप करें, जार्विस सुन रहा है...'
        : 'Interrupted. Speak or type your question...'
    )
    if (!isMuted) {
      startListening()
    }
  }, [selectedLang, isRecordingAudio, stopMediaRecording, isMuted, startListening])

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

    // Simulate call connect, then speak welcome
    const connectTimeout = setTimeout(() => {
      setCallStatus('speaking')
      const welcomeText =
        selectedLang.startsWith('or')
          ? 'ନମସ୍କାର ଚାଷୀ ବନ୍ଧୁ! ମୁଁ ଜାର୍ଭିସ, ଆଗ୍ରୀଡାଇରେକ୍ଟ AI। ଆପଣ ଆପଣଙ୍କ ଫସଲ, ଦର, ଏବଂ ଆବହାୱା ବିଷୟରେ ପ୍ରଶ୍ନ କରନ୍ତୁ।'
          : selectedLang.startsWith('hi')
          ? 'नमस्ते किसान साथी! मैं जारўिस हूँ, AgriDirect AI असिस्टेंट। आप अपनी फसल, मंडी भाव या मौसम के बारे में पूछ सकते हैं।'
          : 'Namaste farmer! I am Jarvis, your AgriDirect AI Assistant built by Abhinash. Ask me about your crops, mandi rates, or weather advisory today.'
      setTranscript(welcomeText)

      speakTextMobile(welcomeText, () => {
        setCallStatus('listening')
        setTranscript(
          !sttSupported
            ? (selectedLang.startsWith('or')
              ? '⌨️ ଆପଣଙ୍କ ପ୍ରଶ୍ନ ନିମ୍ନରେ ଟାଇପ୍ କରନ୍ତୁ ଅଥବା ଉପରେ ଥିବା ବଟନ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ'
              : selectedLang.startsWith('hi')
              ? '⌨️ नीचे टाइप करें या ऊपर बटन दबाएं'
              : '⌨️ Type your question below or tap a quick topic above')
            : (selectedLang.startsWith('or')
              ? "ଶୁଣୁଛି... ଆପଣ କ'ଣ ଜାଣିବାକୁ ଚାହୁଁଛନ୍ତି? (ଉଦ: ଧାନ ଦର, ଆବହାୱା ଖବର)"
              : selectedLang.startsWith('hi')
              ? 'सुन रहा हूँ... बोलिए (उदाहरण: टमाटर में कीड़ा या गेहूँ का भाव)'
              : 'Listening... Speak your question (e.g. What is the current wheat price or tomato disease treatment?)')
        )
        if (sttSupported && !isMuted) startListening()
      })
    }, 1500)

    return () => {
      clearInterval(timer)
      clearTimeout(connectTimeout)
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedLang])

  // Handle text input submission (works seamlessly on PC & Mobile)
  const handleTextSubmit = useCallback(() => {
    const q = textInput.trim()
    if (!q) return
    setTextInput('')
    handleVoiceQuery(q)
  }, [textInput, handleVoiceQuery])

  if (!isOpen) return null

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const handleSimulateQuestion = (q: string) => {
    handleVoiceQuery(q)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="AgriDirect Voice AI Hotline">
      <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5 py-2 sm:py-3">
        {/* Call header */}
        <div className="flex items-center justify-between w-full px-1 sm:px-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
            <span className="tracking-wide">{callStatus === 'connecting' ? 'CONNECTING...' : 'LIVE CALL'}</span>
          </div>

          <span className="font-mono text-slate-300 font-medium bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
            {formatTime(seconds)}
          </span>

          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile/Browser STT advisory banner (only if STT not available) */}
        {!sttSupported && (
          <div className="w-full bg-amber-950/60 border border-amber-600/40 rounded-xl px-3 py-2 flex items-start gap-2 text-left">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200 leading-snug">
              Microphone STT is not supported on this browser (e.g., iOS Safari).
              <strong className="text-amber-100"> Type below or tap a quick question</strong> — Jarvis will speak the answer out loud!
            </p>
          </div>
        )}

        {/* Animated Avatar / Audio Waves with Interruption badge */}
        <div className="relative my-2 sm:my-3 flex items-center justify-center">
          <div
            className={`absolute w-36 h-36 rounded-full transition-all duration-700 ${
              callStatus === 'speaking'
                ? 'bg-emerald-500/20 scale-125 animate-ping'
                : callStatus === 'listening'
                ? 'bg-teal-500/20 scale-110 animate-pulse'
                : 'bg-slate-800/20'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              if (callStatus === 'speaking') {
                handleInterrupt()
              } else if (isRecordingAudio) {
                stopMediaRecording()
              } else {
                startListening()
              }
            }}
            className={`h-24 w-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 z-10 cursor-pointer ${
              callStatus === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/50 hover:scale-105 active:scale-95'
                : isRecordingAudio
                ? 'bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/50 ring-4 ring-rose-400/40 animate-pulse'
                : callStatus === 'listening'
                ? 'bg-gradient-to-tr from-teal-600 to-emerald-600 shadow-teal-500/40 ring-4 ring-emerald-400/30'
                : 'bg-slate-800'
            }`}
            title={callStatus === 'speaking' ? 'Click to interrupt Jarvis' : isRecordingAudio ? 'Click to send voice message' : 'Click to speak'}
          >
            {callStatus === 'speaking' ? (
              <Volume2 className="h-10 w-10 animate-bounce" />
            ) : isRecordingAudio ? (
              <Mic className="h-10 w-10 text-white animate-bounce" />
            ) : callStatus === 'listening' ? (
              <Mic className="h-10 w-10 animate-pulse" />
            ) : (
              <Bot className="h-10 w-10 text-slate-400" />
            )}
          </button>
        </div>

        {/* Equalizer animation bar */}
        {(callStatus === 'speaking' || callStatus === 'listening') && (
          <div className="flex items-center gap-1.5 h-4 justify-center">
            {[35, 70, 95, 55, 85, 45, 80, 60].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full ${callStatus === 'speaking' ? 'bg-emerald-400' : 'bg-teal-400'}`}
                style={{
                  height: `${Math.max(6, (h * Math.sin(Date.now() / 250 + i)) % 16)}px`,
                  animation: `pulse ${(i % 3) * 0.2 + 0.4}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        {/* Status text & transcript */}
        <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 min-h-[95px] flex items-center justify-center text-left">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line text-center">
            {transcript}
          </p>
        </div>

        {/* Interrupt Button (When Jarvis is speaking) */}
        {callStatus === 'speaking' && (
          <button
            type="button"
            onClick={handleInterrupt}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <span>Tap to Interrupt Jarvis</span>
          </button>
        )}

        {/* Always-Available Dual-Mode Text Input (For PC & Mobile) */}
        <div className="w-full flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleTextSubmit()
              }
            }}
            placeholder={
              selectedLang.startsWith('or')
                ? 'ପ୍ରଶ୍ନ ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ଉପରେ କୁହନ୍ତୁ...'
                : selectedLang.startsWith('hi')
                ? 'सवाल टाइप करें या ऊपर बोलें...'
                : 'Type question or speak above (Press Enter)...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
            title="Send query"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Quick sample speech topics — 1-tap query for PC & Mobile */}
        <div className="w-full text-left space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Topics:
          </span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleSimulateQuestion(
                selectedLang.startsWith('or')
                  ? 'ଆଜି ଧାନ ଏବଂ ଚାଉଳ ଦର କେତେ?'
                  : selectedLang.startsWith('hi')
                  ? 'आज पंजाब में गेहूँ का मंडी भाव क्या है?'
                  : "What is today's wheat rate in Punjab?"
              )}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              🌾 {selectedLang.startsWith('or') ? 'ଧାନ ଦର' : selectedLang.startsWith('hi') ? 'गेहूँ मंडी' : 'Wheat Mandi Rate'}
            </button>
            <button
              type="button"
              onClick={() => handleSimulateQuestion(
                selectedLang.startsWith('or')
                  ? "ଟମାଟୋ ପତ୍ରରେ ରୋଗ ଲାଗିଛି, ଚିକିତ୍ସା କ'ଣ?"
                  : 'How to prevent fungus in tomato leaves?'
              )}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              🍅 {selectedLang.startsWith('or') ? 'ଟମାଟୋ ରୋଗ' : 'Tomato Fungus Care'}
            </button>
            <button
              type="button"
              onClick={() => handleSimulateQuestion(
                selectedLang.startsWith('or')
                  ? "ଭୁବନେଶ୍ୱରରେ ଆଜି ଆବହାୱା କ'ଣ?"
                  : 'When will it rain in Bhubaneswar, Odisha?'
              )}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              🌧️ {selectedLang.startsWith('or') ? 'ଆବହାୱା ଖବର' : 'Rain Forecast'}
            </button>
            <button
              type="button"
              onClick={() => handleSimulateQuestion(
                selectedLang.startsWith('or')
                  ? "ତୁମେ କିଏ? ତୁମ ନାଁ କ'ଣ?"
                  : 'Who are you? What is your name?'
              )}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-700/60 hover:border-emerald-500 text-emerald-300 hover:text-white transition-colors active:scale-95"
            >
              🤖 {selectedLang.startsWith('or') ? 'ଜାର୍ଭିସ ପରିଚୟ' : 'Meet Jarvis'}
            </button>
          </div>
        </div>

        {/* Call control action buttons */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {/* Mute/Record Mic Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isRecordingAudio) {
                stopMediaRecording()
              } else {
                const nextMuted = !isMuted
                setIsMuted(nextMuted)
                if (nextMuted && recognitionRef.current) {
                  try { recognitionRef.current.stop() } catch {}
                  recognitionRef.current = null
                } else if (!nextMuted && callStatus === 'listening') {
                  startListening()
                }
              }
            }}
            className={`p-3 rounded-full border transition-all active:scale-95 cursor-pointer ${
              isRecordingAudio
                ? 'bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse'
                : isMuted
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isRecordingAudio ? 'Send voice message' : isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isRecordingAudio ? <Mic className="h-5 w-5 animate-bounce text-rose-300" /> : isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Speaker Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMuted = !isSpeakerMuted
              setIsSpeakerMuted(nextMuted)
              if (nextMuted && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel()
              }
            }}
            className={`p-3 rounded-full border transition-all active:scale-95 ${
              isSpeakerMuted
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isSpeakerMuted ? 'Unmute Jarvis Voice Output' : 'Mute Jarvis Voice Output'}
          >
            <Volume2 className={`h-5 w-5 ${isSpeakerMuted ? 'line-through opacity-50' : ''}`} />
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => {
              cleanup()
              onClose()
            }}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Modal>
  )
}

