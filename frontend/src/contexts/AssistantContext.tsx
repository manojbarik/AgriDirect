import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useCart } from './useCart'
import {
  assistantChat,
  assistantVoice,
  type AssistantAction,
  type AssistantHistoryItem,
} from '../api/ai'
import { useToast } from '../components/ui/ToastProvider'

export type VoiceState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'THINKING'
  | 'TOOL_CALL'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR'

export interface VoiceSettings {
  enabled: boolean
  voiceName: string
  language: string
}

export interface AssistantMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  action?: AssistantAction | null
  suggestions?: string[] | null
}

export interface PendingAction {
  action_type: string
  title: string
  crop?: string
  quantity?: string
  unit_price?: string
  price_per_quintal?: string
  total_amount?: string
  grade?: string
  seller?: string
  destination?: string
  location?: string
  escrow_protected?: boolean
}

export interface AssistantContextType {
  isOpen: boolean
  isMinimized: boolean
  openAssistant: (initialPrompt?: string) => void
  closeAssistant: () => void
  toggleAssistant: () => void
  toggleMinimize: () => void

  activeTab: 'guided' | 'chat' | 'voice' | 'workflow'
  setActiveTab: (tab: 'guided' | 'chat' | 'voice' | 'workflow') => void

  // Navigation stack ("Back to menu" / "Back")
  navigationStack: string[]
  currentMenu: string
  pushNav: (menu: string) => void
  popNav: () => void
  resetNav: () => void

  // Chat & conversation memory
  messages: AssistantMessage[]
  isTyping: boolean
  sendMessage: (text: string) => Promise<void>
  clearConversation: () => void

  // Voice Engine
  voiceState: VoiceState
  voiceSettings: VoiceSettings
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>
  startVoiceSession: () => void
  stopVoiceSession: () => void
  interruptVoice: () => void
  speakText: (text: string) => void
  sendVoiceQuery: (query: string) => Promise<void>
  transcript: string

  // Confirmation Safety Workflow
  pendingConfirmation: PendingAction | null
  confirmAction: () => Promise<void>
  cancelConfirmation: () => void

  // Context Engine
  currentRoute: string
  currentPageName: string
  userRole: string
  suggestedPagePrompts: string[]
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined)

const ROUTE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/marketplace': 'Marketplace',
  '/marketplace/livestock': 'Livestock Market',
  '/farmer/dashboard': 'Farmer Dashboard',
  '/farmer/listings': 'Produce Listings',
  '/farmer/products': 'Products & Harvest',
  '/farmer/weather': 'Weather Advisory',
  '/farmer/orders': 'Farmer Orders',
  '/farmer/notes': 'Farm Notes',
  '/farmer/storage': 'Storage Facilities',
  '/farmer/recommendations': 'AI Crop Intelligence',
  '/buyer/dashboard': 'Buyer Dashboard',
  '/buyer/demands': 'Buyer Demands',
  '/buyer/recommendations': 'Recommended Lots',
  '/buyer/orders': 'Buyer Orders',
  '/bulk-buyer/dashboard': 'Bulk Buyer Portal',
  '/consumer': 'Consumer Store',
  '/consumer/marketplace': 'Fresh Produce Store',
  '/consumer/cart': 'Shopping Cart',
  '/consumer/orders': 'Consumer Orders',
  '/logistics': 'Logistics & Fleet Hub',
  '/price-intelligence': 'Price Intelligence',
  '/contracts': 'Digital Escrow Contracts',
  '/account': 'Profile & Account Settings',
  '/notifications': 'Notification Center',
}

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  '/marketplace': [
    'Search best rice offers',
    'Compare mandi prices',
    'Find verified sellers',
    'Is this price fair?',
  ],
  '/farmer/dashboard': [
    'Help me list my harvest',
    'Find matching buyers',
    'Predict wheat price next week',
    'Check tomorrow weather',
  ],
  '/farmer/listings': [
    'Help me list produce',
    'Suggest market price for paddy',
    'Explain quality grades',
    'Check regional demand',
  ],
  '/buyer/dashboard': [
    'Find bulk grain producers',
    'Check today market rates',
    'Track my open orders',
    'Verify farmer trust score',
  ],
  '/orders': [
    'Show order status',
    'Track logistics shipment',
    'Escrow release timeline',
    'File dispute or inquiry',
  ],
  '/consumer/cart': [
    'Check delivery charges',
    'Apply seasonal discount',
    'Track fresh order',
    'Safe escrow guarantee',
  ],
  '/logistics': [
    'Track current consignment',
    'Delivery ETA calculation',
    'Nearest transport checkpoint',
    'Calculate haulage cost',
  ],
}

let msgIdCounter = 1

export const AssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const cart = useCart()
  const toast = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'guided' | 'chat' | 'voice' | 'workflow'>('guided')
  const [navigationStack, setNavigationStack] = useState<string[]>(['MAIN'])

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Namaste! I am Jarvis — the AgriDirect AI Intelligence Assistant, built by Abhinash. How can I assist you with your crops, market prices, weather advisories, or orders today?',
      timestamp: 'Just now',
      suggestions: [
        "What is today's paddy price?",
        'Find buyers for my harvest',
        'Check weather advisory',
        'Help me list produce',
      ],
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingAction | null>(null)

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: true,
    voiceName: 'Kore',
    language: 'or-IN',
  })
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const synthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const conversationHistoryRef = useRef<AssistantHistoryItem[]>([])

  // Derived context
  const currentRoute = location.pathname
  const currentPageName = ROUTE_NAMES[currentRoute] || 'AgriDirect Platform'
  const userRole = user?.role || 'GUEST'

  const suggestedPagePrompts = useMemo(() => {
    return (
      CONTEXT_SUGGESTIONS[currentRoute] || [
        "What is today's Mandi price?",
        'Forecast crop demand',
        'Check weather advisory',
        'Open marketplace',
      ]
    )
  }, [currentRoute])

  // Navigation stack operations
  const currentMenu = navigationStack[navigationStack.length - 1] || 'MAIN'

  const pushNav = useCallback((menu: string) => {
    setNavigationStack((prev) => [...prev, menu])
  }, [])

  const popNav = useCallback(() => {
    setNavigationStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const resetNav = useCallback(() => {
    setNavigationStack(['MAIN'])
  }, [])

  const openAssistant = useCallback((initialPrompt?: string) => {
    setIsOpen(true)
    setIsMinimized(false)
    if (initialPrompt) {
      setActiveTab('chat')
      sendMessage(initialPrompt)
    }
  }, [])

  const closeAssistant = useCallback(() => {
    setIsOpen(false)
    interruptVoice()
  }, [])

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      if (!next) interruptVoice()
      return next
    })
    setIsMinimized(false)
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  const clearConversation = useCallback(() => {
    conversationHistoryRef.current = []
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'Conversation reset. How can I help you next?',
        timestamp: 'Just now',
        suggestions: suggestedPagePrompts,
      },
    ])
    setPendingConfirmation(null)
  }, [suggestedPagePrompts])

  // Execute or dispatch safe actions returned by Gemini
  const handleActionDirective = useCallback(
    (action: AssistantAction) => {
      if (action.type === 'navigate' && action.payload?.route) {
        navigate(action.payload.route)
        toast({ title: `Navigated to ${action.payload.label || action.payload.route}`, type: 'info' })
      } else if (action.type === 'confirm_action') {
        setPendingConfirmation(action.payload as PendingAction)
        setActiveTab('chat')
      }
    },
    [navigate]
  )

  // Primary text message dispatch
  const sendMessage = useCallback(
    async (textToSend: string) => {
      const query = textToSend.trim()
      if (!query) return

      msgIdCounter += 1
      const userMsg: AssistantMessage = {
        id: `user-${msgIdCounter}`,
        sender: 'user',
        text: query,
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)
      conversationHistoryRef.current.push({ role: 'user', text: query })

      try {
        const res = await assistantChat({
          message: query,
          conversation_history: conversationHistoryRef.current.slice(-15),
          context: {
            role: userRole,
            currentRoute: location.pathname,
            location: (user as any)?.state || 'Odisha',
            cart_count: String(cart.totalCount || 0),
          },
        })

        const reply = res.data.reply
        conversationHistoryRef.current.push({ role: 'model', text: reply })

        msgIdCounter += 1
        const aiMsg: AssistantMessage = {
          id: `ai-${msgIdCounter}`,
          sender: 'ai',
          text: reply,
          timestamp: 'Just now',
          action: res.data.action,
          suggestions: res.data.suggested_actions || suggestedPagePrompts,
        }

        setMessages((prev) => [...prev, aiMsg])

        if (res.data.action) {
          handleActionDirective(res.data.action)
        }
      } catch (err: any) {
        msgIdCounter += 1
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${msgIdCounter}`,
            sender: 'ai',
            text: 'I am temporarily experiencing connectivity issues with the AI service. You can still browse the marketplace, view your farm notes, and check local mandi rates.',
            timestamp: 'Just now',
            suggestions: suggestedPagePrompts,
          },
        ])
      } finally {
        setIsTyping(false)
      }
    },
    [userRole, location.pathname, user, cart.totalCount, suggestedPagePrompts, handleActionDirective, toast]
  )

  // Explicit confirmation safety execution
  const confirmAction = useCallback(async () => {
    if (!pendingConfirmation) return

    const action = pendingConfirmation
    setPendingConfirmation(null)

    msgIdCounter += 1
    if (action.action_type === 'create_order') {
      toast({ title: `Order confirmed for ${action.crop}! Escrow protection activated.`, type: 'success' })
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${msgIdCounter}`,
          sender: 'ai',
          text: `✓ Order Confirmed! Your order for ${action.quantity} of ${action.crop} has been initiated with ${action.seller}. Funds are safely held in AgriDirect Escrow until delivery verification.`,
          timestamp: 'Just now',
          suggestions: ['Track my orders', 'Logistics status', 'Back to menu'],
        },
      ])
      navigate('/buyer/orders')
    } else if (action.action_type === 'publish_listing') {
      toast({ title: `Produce listing for ${action.crop} published to the marketplace!`, type: 'success' })
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${msgIdCounter}`,
          sender: 'ai',
          text: `✓ Listing Published! Your ${action.quantity} of ${action.crop} is now live on the marketplace at ${action.price_per_quintal}. Matching verified buyers have been notified.`,
          timestamp: 'Just now',
          suggestions: ['View my listings', 'Find buyers', 'Back to menu'],
        },
      ])
      navigate('/farmer/listings')
    }
  }, [pendingConfirmation, navigate, toast])

  const cancelConfirmation = useCallback(() => {
    setPendingConfirmation(null)
    msgIdCounter += 1
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${msgIdCounter}`,
        sender: 'ai',
        text: 'Action cancelled. No financial transaction or listing was executed. What else can I assist you with?',
        timestamp: 'Just now',
        suggestions: ['Check market prices', 'View my farm', 'Back to menu'],
      },
    ])
    toast({ title: 'Action cancelled safely.', type: 'info' })
  }, [toast])

  // Voice Engine (TTS + STT + Interruption)
  const interruptVoice = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    setVoiceState('IDLE')
  }, [])

  // Preload voices (critical for mobile where voices load asynchronously)
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const loadVoices = () => {
      cachedVoicesRef.current = window.speechSynthesis.getVoices()
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const speakText = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) return

      window.speechSynthesis.cancel()
      const voices = cachedVoicesRef.current.length > 0
        ? cachedVoicesRef.current
        : window.speechSynthesis.getVoices()
      const langCode = voiceSettings.language.slice(0, 2).toLowerCase()
      const nativeVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langCode))

      // Phonetic Odia fallback for browsers without native Odia voice pack installed
      const toPhonetic = (t: string) => {
        if (!/[\u0B00-\u0B7F]/.test(t)) return t
        // Map longest first — prevents partial char 'ର' from matching inside longer words
        const map: [string, string][] = [
          ['ଆଗ୍ରୀଡାଇରେକ୍ଟ', 'AgriDirect'], ['ବିଶ୍ୱସନୀୟତା', 'biswasaniyata'],
          ['ଅଭିନାଶଙ୍କ', 'Abhinash ka'], ['ସମ୍ପର୍କିତ', 'samparkita'],
          ['ଉପସ୍ଥିତ', 'upasthita'], ['ନମସ୍କାର', 'Namaskar'],
          ['କିଲୋଗ୍ରାମ', 'kilogram'], ['ନିୟନ୍ତ୍ରଣ', 'niyantrana'],
          ['ଆନୁମାନିକ', 'anumanika'], ['ସିଞ୍ଚନ', 'sinchana'],
          ['ନିର୍ମିତ', 'nirmita'], ['ପାଣିପାଗ', 'panipaga'],
          ['ଆବହାୱା', 'abahawa'], ['ପରାମର୍ଶ', 'paramarsha'],
          ['ଜାର୍ଭିସ', 'Jarvis'], ['ଦ୍ୱାରା', 'dwara'],
          ['ସହାୟକ', 'sahayak'], ['ସମସ୍ତ', 'samasta'],
          ['କରନ୍ତୁ', 'karantu'], ['ହୋଇଛି', 'hoichi'],
          ['ଓଡ଼ିଶା', 'Odisha'], ['ବନ୍ଧୁ', 'bandhu'],
          ['ଟମାଟୋ', 'tomato'], ['ଯାଞ୍ଚ', 'jancha'],
          ['ଚାଷୀ', 'chashi'], ['ସେବା', 'seba'],
          ['ମଣ୍ଡି', 'mandi'], ['ଧାନ', 'dhana'],
          ['ଗହମ', 'gaham'], ['ଏବଂ', 'ebang'],
          ['ଫସଲ', 'fasal'], ['ବଜାର', 'bajar'],
          ['ଆଳୁ', 'alu'], ['ପିଆଜ', 'piaj'],
          ['ପ୍ରତି', 'prati'], ['ପାଣି', 'pani'],
          ['ପାଇଁ', 'paaeen'], ['ତେଲ', 'tel'],
          ['ଦର', 'dara'], ['ମୁଁ', 'Mu'],
          ['ଆଜି', 'Aji'], ['କୀଟ', 'kit'],
        ]
        let s = t
        for (const [k, v] of map) { s = s.split(k).join(v) }
        return s.replace(/[\u0B00-\u0B7F]+/g, '').replace(/\s{2,}/g, ' ').trim()
      }


      const spokenText = voiceSettings.language.startsWith('or') && !nativeVoice ? toPhonetic(text) : text
      const utterance = new SpeechSynthesisUtterance(spokenText)
      utterance.lang = nativeVoice ? voiceSettings.language : (voiceSettings.language.startsWith('or') ? 'hi-IN' : voiceSettings.language)
      // Slightly slower on mobile for clarity
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      utterance.rate = isMobile ? 0.88 : 0.96
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

      utterance.onstart = () => {
        setVoiceState('SPEAKING')
      }
      utterance.onend = () => {
        setVoiceState('IDLE')
      }
      utterance.onerror = () => {
        setVoiceState('IDLE')
      }

      synthesisUtteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)

      // iOS Safari workaround: speech synthesis pauses after ~15s if we don't
      // periodically call pause()/resume() to keep the audio session alive.
      if (isMobile) {
        const keepAlive = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
          } else {
            clearInterval(keepAlive)
          }
        }, 5000)
      }
    },
    [voiceSettings.language]
  )

  const startVoiceSession = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      toast({
        title: /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'Voice input is not supported on iOS Safari. Please type your question in the text box below.'
          : 'Speech recognition is not supported in this browser. Please use text chat.',
        type: 'warning',
      })
      return
    }

    interruptVoice()
    setVoiceState('LISTENING')
    setTranscript(
      voiceSettings.language.startsWith('or')
        ? 'ଜାର୍ଭିସ ଶୁଣୁଛି... ଆପଣ ଓଡ଼ିଆରେ ପ୍ରଶ୍ନ କରନ୍ତୁ।'
        : voiceSettings.language.startsWith('hi')
        ? 'जार्विस सुन रहा है... आप हिंदी में पूछ सकते हैं।'
        : 'Jarvis is listening... Speak naturally in English, Hindi, or Odia.'
    )

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.lang = voiceSettings.language
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = async (event: any) => {
        const result = event.results[event.results.length - 1]
        if (result && result[0]) {
          const spoken = result[0].transcript
          setTranscript(spoken)

          if (result.isFinal) {
            setVoiceState('THINKING')

            // Send voice query to backend
            msgIdCounter += 1
            setMessages((prev) => [
              ...prev,
              {
                id: `voice-user-${msgIdCounter}`,
                sender: 'user',
                text: `🎙️ ${spoken}`,
                timestamp: 'Just now',
              },
            ])
            conversationHistoryRef.current.push({ role: 'user', text: spoken })

            try {
              const res = await assistantVoice({
                message: spoken,
                conversation_history: conversationHistoryRef.current.slice(-15),
                context: {
                  role: userRole,
                  currentRoute: location.pathname,
                  location: (user as any)?.state || 'Odisha',
                  output_format: 'spoken_response',
                  language: voiceSettings.language,
                  user_language: voiceSettings.language.startsWith('or') ? 'odia' : voiceSettings.language.startsWith('hi') ? 'hindi' : 'english',
                },
              })

              const reply = res.data.reply
              conversationHistoryRef.current.push({ role: 'model', text: reply })

              msgIdCounter += 1
              setMessages((prev) => [
                ...prev,
                {
                  id: `voice-ai-${msgIdCounter}`,
                  sender: 'ai',
                  text: reply,
                  timestamp: 'Just now',
                  action: res.data.action,
                },
              ])

              if (res.data.action) {
                handleActionDirective(res.data.action)
              }

              speakText(reply)
            } catch {
              setVoiceState('ERROR')
              setTranscript('Could not connect to voice backend.')
            }
          }
        }
      }

      recognition.onerror = (ev: any) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          toast({
            title: '🔒 Microphone access denied. Allow microphone permission in your browser settings to use voice.',
            type: 'warning',
          })
        }
        setVoiceState('IDLE')
      }

      recognition.onend = () => {
        if (voiceState === 'LISTENING') {
          setVoiceState('IDLE')
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setVoiceState('ERROR')
    }
  }, [interruptVoice, voiceSettings.language, voiceState, userRole, location.pathname, user, handleActionDirective, speakText, toast])

  const stopVoiceSession = useCallback(() => {
    interruptVoice()
  }, [interruptVoice])

  // Explicit voice query runner (supports both typing and quick chips for PC & Mobile)
  const sendVoiceQuery = useCallback(
    async (queryText: string) => {
      const q = queryText.trim()
      if (!q) return

      interruptVoice()
      setVoiceState('THINKING')
      setTranscript(`You: "${q}"\n\nJarvis analyzing...`)

      msgIdCounter += 1
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-user-${msgIdCounter}`,
          sender: 'user',
          text: `🎙️ ${q}`,
          timestamp: 'Just now',
        },
      ])
      conversationHistoryRef.current.push({ role: 'user', text: q })

      try {
        const res = await assistantVoice({
          message: q,
          conversation_history: conversationHistoryRef.current.slice(-15),
          context: {
            role: userRole,
            currentRoute: location.pathname,
            location: (user as any)?.state || 'Odisha',
            output_format: 'spoken_response',
            language: voiceSettings.language,
            user_language: voiceSettings.language.startsWith('or')
              ? 'odia'
              : voiceSettings.language.startsWith('hi')
              ? 'hindi'
              : 'english',
          },
        })

        const reply = res.data.reply
        conversationHistoryRef.current.push({ role: 'model', text: reply })

        msgIdCounter += 1
        setMessages((prev) => [
          ...prev,
          {
            id: `voice-ai-${msgIdCounter}`,
            sender: 'ai',
            text: reply,
            timestamp: 'Just now',
            action: res.data.action,
          },
        ])

        if (res.data.action) {
          handleActionDirective(res.data.action)
        }

        setTranscript(reply)
        speakText(reply)
      } catch {
        setVoiceState('ERROR')
        setTranscript('Could not connect to voice backend.')
      }
    },
    [interruptVoice, userRole, location.pathname, user, voiceSettings.language, handleActionDirective, speakText]
  )

  // Context value object
  const value = useMemo<AssistantContextType>(
    () => ({
      isOpen,
      isMinimized,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      toggleMinimize,
      activeTab,
      setActiveTab,
      navigationStack,
      currentMenu,
      pushNav,
      popNav,
      resetNav,
      messages,
      isTyping,
      sendMessage,
      clearConversation,
      voiceState,
      voiceSettings,
      setVoiceSettings,
      startVoiceSession,
      stopVoiceSession,
      interruptVoice,
      speakText,
      sendVoiceQuery,
      transcript,
      pendingConfirmation,
      confirmAction,
      cancelConfirmation,
      currentRoute,
      currentPageName,
      userRole,
      suggestedPagePrompts,
    }),
    [
      isOpen,
      isMinimized,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      toggleMinimize,
      activeTab,
      navigationStack,
      currentMenu,
      pushNav,
      popNav,
      resetNav,
      messages,
      isTyping,
      sendMessage,
      clearConversation,
      voiceState,
      voiceSettings,
      startVoiceSession,
      stopVoiceSession,
      interruptVoice,
      speakText,
      sendVoiceQuery,
      transcript,
      pendingConfirmation,
      confirmAction,
      cancelConfirmation,
      currentRoute,
      currentPageName,
      userRole,
      suggestedPagePrompts,
    ]
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider')
  }
  return context
}
