import React from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { useDraggableAssistant } from './useDraggableAssistant'
import { useAssistant } from '../../contexts/useAssistant'

export const AgriDirectAssistantLauncher: React.FC = () => {
  const { isOpen, openAssistant, voiceState } = useAssistant()
  const { position, onMouseDown, onTouchStart, hasMoved } = useDraggableAssistant()

  if (isOpen) return null

  const handleClick = (e: React.MouseEvent) => {
    // If the user was dragging, do not open the panel
    if (hasMoved()) return
    e.stopPropagation()
    openAssistant()
  }

  const isVoiceActive = voiceState === 'LISTENING' || voiceState === 'SPEAKING'

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className="fixed top-0 left-0 z-40 select-none transition-shadow cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="region"
      aria-label="AgriDirect AI Assistant Launcher"
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open AgriDirect AI Global Assistant"
        className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 text-white shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        {/* Animated ambient glow ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 opacity-30 blur group-hover:opacity-75 transition duration-500 group-hover:duration-200 animate-pulse" />

        {/* Icon & Online Badge */}
        <div className="relative flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-emerald-900/90 border border-emerald-300/40 flex items-center justify-center shadow-inner">
            <Bot className={`h-4.5 w-4.5 text-amber-300 ${isVoiceActive ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`} />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-emerald-950 ${
              isVoiceActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
            }`}
          />
        </div>

        {/* Brand label & tagline */}
        <div className="flex flex-col text-left pr-1">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-xs font-bold tracking-wide text-white">AgriDirect AI</span>
            <Sparkles className="h-2.5 w-2.5 text-amber-300" />
          </div>
          <span className="text-[10px] text-emerald-200/80 font-medium leading-tight">
            {isVoiceActive ? 'Voice active...' : 'Ask me anything'}
          </span>
        </div>
      </button>
    </div>
  )
}
