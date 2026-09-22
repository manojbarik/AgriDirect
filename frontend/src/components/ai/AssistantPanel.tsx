import React, { useState, useRef, useEffect } from 'react'
import {
  Bot,
  X,
  Sparkles,
  Mic,
  Send,
  Minimize2,
  Maximize2,
  Compass,
  MessageSquare,
  RotateCcw,
  Store,
  Radio,
  Trash2,
} from 'lucide-react'
import { useAssistant } from '../../contexts/useAssistant'
import { AssistantGuidedMenu } from './AssistantGuidedMenu'
import { VoiceAgent } from './VoiceAgent'
import { ListingAssistantWorkflow } from './ListingAssistantWorkflow'
import { ConfirmationCard } from './ConfirmationCard'

export const AssistantPanel: React.FC = () => {
  const {
    isOpen,
    closeAssistant,
    isMinimized,
    toggleMinimize,
    activeTab,
    setActiveTab,
    messages,
    isTyping,
    sendMessage,
    clearConversation,
    voiceState,
    startVoiceSession,
    pendingConfirmation,
    confirmAction,
    cancelConfirmation,
    currentMenu,
    resetNav,
    popNav,
  } = useAssistant()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, activeTab])

  if (!isOpen) return null

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    await sendMessage(trimmed)
  }

  const isVoiceActive = voiceState === 'LISTENING' || voiceState === 'SPEAKING'

  // If minimized, display a sleek compact bar at bottom-right
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-3 px-4 rounded-2xl bg-[#091710]/95 border border-emerald-500/40 shadow-2xl text-slate-100 backdrop-blur-md animate-fadeIn">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Bot className="h-4 w-4 text-amber-300" />
          </div>
          <span className="text-xs font-bold text-white">AgriDirect AI</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 border-l border-emerald-500/30 pl-3">
          <button
            type="button"
            onClick={toggleMinimize}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Expand Panel"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Close Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Background click-away on mobile/desktop */}
      <div
        className="hidden sm:block flex-1"
        onClick={closeAssistant}
        aria-hidden="true"
      />

      {/* Main Panel Container */}
      <div className="w-full sm:w-[460px] h-full bg-[#08150e]/95 border-l border-emerald-500/30 flex flex-col shadow-2xl relative text-slate-100 backdrop-blur-xl sm:rounded-l-3xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 bg-[#06100b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/70 border border-emerald-400/40">
              <Bot className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  AgriDirect AI Assistant
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70">
                Your intelligent marketplace operating partner
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab(activeTab === 'voice' ? 'chat' : 'voice')
                if (activeTab !== 'voice') startVoiceSession()
              }}
              className={`p-1.5 rounded-xl border transition-colors ${
                activeTab === 'voice' || isVoiceActive
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Voice Mode"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleMinimize}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Minimize Panel"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Close Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-emerald-500/20 bg-[#07130c] px-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('guided')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'guided'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Guided Menu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat & Actions</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('voice')
              startVoiceSession()
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'voice'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Live Voice</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'workflow'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Listing Wizard</span>
          </button>
        </div>

        {/* Dynamic Body Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'guided' && <AssistantGuidedMenu />}

          {activeTab === 'voice' && <VoiceAgent />}

          {activeTab === 'workflow' && <ListingAssistantWorkflow />}

          {activeTab === 'chat' && (
            <div className="p-4 space-y-3.5">
              {/* Back to Menu Stack Bar */}
              {currentMenu !== 'MAIN' && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={popNav}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    ← Back to {currentMenu}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetNav()
                      setActiveTab('guided')
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Main Menu</span>
                  </button>
                </div>
              )}

              {/* Message Stream */}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-md shadow-emerald-950/50'
                        : 'bg-slate-900/90 text-slate-200 border border-emerald-500/20 rounded-bl-none shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>

                  {/* Suggestion Chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => sendMessage(s)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-left transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Pending Irreversible Action Confirmation Card */}
              {pendingConfirmation && (
                <ConfirmationCard
                  action={pendingConfirmation}
                  onConfirm={confirmAction}
                  onCancel={cancelConfirmation}
                />
              )}

              {/* Typing Loader Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/20 w-fit">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin" />
                  <span className="text-xs text-slate-400">Gemini AI is preparing advice...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Bottom Composer */}
        <div className="p-3 border-t border-emerald-500/20 bg-[#06100b]">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearConversation}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('voice')
                startVoiceSession()
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
              title="Voice Input"
            >
              <Mic className="h-4 w-4" />
            </button>

            <input
              type="text"
              placeholder="Ask anything or request action in English, Hindi, or Odia..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 transition-transform active:scale-95"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
