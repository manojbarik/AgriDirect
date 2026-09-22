import React from 'react'
import { Bot, Sparkles } from 'lucide-react'

interface FloatingAssistantButtonProps {
  onClick: () => void
}

export const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open AgriDirect AI Assistant"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-2xl shadow-emerald-950/70 border border-emerald-400/30 hover:scale-105 active:scale-95 transition-all duration-300"
    >
      <div className="relative">
        <Bot className="h-5 w-5 text-white animate-pulse" />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-emerald-900" />
      </div>

      <span className="text-xs font-bold tracking-wide flex items-center gap-1">
        <span>Agri AI</span>
        <Sparkles className="h-3 w-3 text-amber-300" />
      </span>
    </button>
  )
}
