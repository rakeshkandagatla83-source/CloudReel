import { useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Radio } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLogCtx } from './StudioContext'
import type { LogType } from '../../types/studio'

const LOG_COLORS: Record<LogType, string> = {
  sent:    'bg-emerald-950/50 text-emerald-300 border-l-2 border-emerald-500/70',
  master:  'bg-[#3031cb]/10 text-[#ff6b6b] border-l-2 border-[#3031cb]/60',
  preload: 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500/60',
  info:    'bg-white/3 text-white/70 border-l-2 border-white/20',
  err:     'bg-red-950/50 text-red-300 border-l-2 border-red-500/70',
  warn:    'bg-amber-950/50 text-amber-300 border-l-2 border-amber-500/60',
  divider: 'text-white/45 italic border-l-2 border-white/15',
  gfx:     'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500/60',
}

export function MessageLog() {
  const { logEntries, logOpen, setLogOpen } = useLogCtx()
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logOpen && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logEntries, logOpen])

  return (
    <div className="shrink-0 border-t border-white/6">
      <button
        type="button"
        onClick={() => setLogOpen(!logOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-primary-bg hover:bg-white/2 cursor-pointer transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[10px] text-white/60">
          <Radio size={10} />
          Message Log
          <span className="text-[9px] text-white/45">({logEntries.length})</span>
        </span>
        <span className="text-white/50">{logOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}</span>
      </button>

      {logOpen && (
        <div ref={logRef} className="h-36 overflow-y-auto bg-[#040810] px-2 py-1 flex flex-col gap-0.5">
          {logEntries.length === 0 && (
            <div className="text-[10px] text-white/45 text-center py-4">No messages yet.</div>
          )}
          {logEntries.map(entry => (
            <div
              key={entry.id}
              className={cn('px-2 py-0.5 rounded-sm text-[10px] font-mono whitespace-pre-wrap break-all', LOG_COLORS[entry.type])}
            >
              {entry.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
