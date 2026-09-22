import React from 'react'
import { Sparkles, Bell } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'

export interface ComingSoonCardProps {
  title: string
  description: string
  tag?: string
  expectedDate?: string
  features?: string[]
  onNotifyMe?: () => void
  isNotified?: boolean
  className?: string
}

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({
  title,
  description,
  tag = 'Feature Preview',
  expectedDate,
  features = [],
  onNotifyMe,
  isNotified = false,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-emerald-950/30 to-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-xl text-slate-100 ${className}`}
    >
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {tag}
            </Badge>
            {expectedDate && (
              <span className="text-xs text-slate-400 font-medium">Coming {expectedDate}</span>
            )}
          </div>

          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {title}
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed">
            {description}
          </p>

          {features.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-emerald-200">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {feat}
                </li>
              ))}
            </ul>
          )}
        </div>

        {onNotifyMe && (
          <div className="flex-shrink-0">
            <Button
              variant={isNotified ? 'outline' : 'primary'}
              size="md"
              onClick={onNotifyMe}
              className={isNotified ? 'border-emerald-500 text-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'}
            >
              <Bell className="h-4 w-4 mr-2" />
              {isNotified ? 'Notifications Enabled' : 'Notify When Live'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
