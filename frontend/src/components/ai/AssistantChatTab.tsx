import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Bot, User, Mic, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { assistantChat, type AssistantHistoryItem } from '../../api/ai'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  suggestions?: string[]
}

const QUICK_PROMPTS = [
  'What is the best sowing time for Wheat in North India?',
  'How do I identify and treat early blight on Tomatoes?',
  'What are the eligibility criteria for PM-KISAN scheme?',
  'How to maximize milk yield in Gir cows naturally?',
  'When is the optimal time to harvest Kharif Onions?',
]

// Offline fallback knowledge base — used only when the backend is unreachable.
const AI_KNOWLEDGE_BASE: Record<string, string> = {
  wheat:
    'For North India (Punjab, Haryana, UP), the ideal sowing window for timely sown irrigated Wheat is November 1 to November 15. For late-sown varieties (like PBW 550, HD 3059), sowing can extend until December 10. Ensure seed treatment with Vitavax (2.5g/kg seed) to prevent loose smut.',
  blight:
    'Early blight (Alternaria solani) on Tomatoes causes concentric dark brown target-board rings on older leaves. Treatment: 1) Spray Mancozeb (2.5g/L) or Chlorothalonil preventatively. 2) For active infections, apply Azoxystrobin (1ml/L) or Difenoconazole (1ml/L). Maintain proper spacing and avoid overhead irrigation.',
  kisan:
    'PM-KISAN provides eligible landholder farmer families financial benefit of ₹6,000 per year in three equal 4-monthly installments of ₹2,000. Requirements: 1) Active land ownership records in your name. 2) Aadhaar-seeded bank account. 3) Completed e-KYC on the pmkisan.gov.in portal or via biometric CSC center.',
  gir:
    'To optimize indigenous Gir cow milk yield (12-16L/day): 1) Feed a balanced ration: 60% green fodder (berseem, sorghum), 40% dry fodder + bypass protein concentrate (400g per liter of milk). 2) Provide 50-60g mineral mixture with chelated zinc & selenium daily. 3) Ensure cool, shaded housing with clean freshwater available 24/7.',
  onion:
    'Kharif Onions should be harvested when 50-60% of foliage tops fall over. Stop irrigation 10-15 days prior to harvest to prevent rotting. Cure bulbs in shade with tops intact for 3-5 days before clipping neck to 2.5cm. This extends shelf life by 4-6 weeks in well-ventilated storage.',
}

function offlineFallback(query: string): string {
  const lower = query.toLowerCase()
  if (lower.includes('wheat') || lower.includes('gehu')) return AI_KNOWLEDGE_BASE.wheat
  if (lower.includes('blight') || lower.includes('tomato') || lower.includes('disease'))
    return AI_KNOWLEDGE_BASE.blight
  if (lower.includes('pm') || lower.includes('kisan') || lower.includes('scheme') || lower.includes('subsidy'))
    return AI_KNOWLEDGE_BASE.kisan
  if (lower.includes('gir') || lower.includes('cow') || lower.includes('animal') || lower.includes('milk'))
    return AI_KNOWLEDGE_BASE.gir
  if (lower.includes('onion') || lower.includes('harvest') || lower.includes('storage'))
    return AI_KNOWLEDGE_BASE.onion
  return `Based on current agricultural data for "${query}": We recommend monitoring soil moisture levels, cross-checking current regional Mandi rates, and applying IPM (Integrated Pest Management) practices. You can also review real-time crop contracts and live livestock listings directly in the AgriDirect marketplace.`
}

let messageCounter = 1

export const AssistantChatTab: React.FC<{ onStartVoice?: () => void }> = ({ onStartVoice }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Namaste! I am AgriDirect AI Assistant powered by Gemini. Ask me anything about crop protection, livestock care, market prices, weather advisories, or government agricultural subsidies.',
      timestamp: 'Just now',
      suggestions: ['Wheat sowing time', 'Tomato blight cure', 'PM-KISAN details', 'Gir cow care'],
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<AssistantHistoryItem[]>([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || input).trim()
      if (!query) return

      messageCounter += 1
      const currentId = `user-${messageCounter}`
      const userMsg: Message = {
        id: currentId,
        sender: 'user',
        text: query,
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, userMsg])
      if (!textToSend) setInput('')
      setIsTyping(true)

      // Build conversation history for backend
      conversationRef.current.push({ role: 'user', text: query })

      let reply: string
      let usedFallback = false

      try {
        const response = await assistantChat({
          message: query,
          conversation_history: conversationRef.current.slice(-20),
          context: {},
        })
        reply = response.data.reply
        if (response.data.source === 'error') {
          usedFallback = true
        }
        setIsOffline(false)
      } catch {
        // Backend unreachable — use offline fallback
        reply = offlineFallback(query)
        usedFallback = true
        setIsOffline(true)
      }

      // Add AI response to conversation history
      conversationRef.current.push({ role: 'model', text: reply })

      messageCounter += 1
      const aiMsg: Message = {
        id: `ai-${messageCounter}`,
        sender: 'ai',
        text: usedFallback ? `⚡ Offline Mode: ${reply}` : reply,
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    },
    [input],
  )

  return (
    <div className="flex flex-col h-[520px] rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-hidden">
      {/* Voice Prompt Bar */}
      {onStartVoice && (
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Hands full in the field? Talk hands-free!
          </span>
          <button
            type="button"
            onClick={onStartVoice}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm transition-colors"
          >
            <Mic className="h-3 w-3" />
            Start Voice Call
          </button>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div className="px-4 py-1.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-amber-400" />
          <span className="text-[11px] text-amber-300">
            AI backend unreachable — using offline knowledge base
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                m.sender === 'user'
                  ? 'bg-emerald-600'
                  : 'bg-gradient-to-br from-teal-500 to-emerald-700'
              }`}
            >
              {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              <div
                className={`mt-1.5 text-[10px] ${
                  m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </div>

              {m.suggestions && m.suggestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-[11px] text-emerald-300 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts carousel */}
      <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all flex-shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask in English or Hindi (e.g. Tomato blight, Wheat sowing)..."
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        />
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl disabled:opacity-40 transition-colors"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
