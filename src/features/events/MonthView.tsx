import { useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/event'
import { DAYS, toDateStr, eventsOnDate, evStatus, fmtEpochTime } from './eventUtils'

interface MonthViewProps {
  year: number
  month: number
  events: CalendarEvent[]
  onDayClick: (dateStr: string) => void
  onEventClick: (id: string) => void
  onMoreClick: (dateStr: string) => void
  onDeleteClick: (id: string) => void
}

function chipCls(ev: CalendarEvent): string {
  const st = evStatus(ev)
  if (st === 'ongoing') return 'bg-emerald-100 text-emerald-800 border-l-2 border-l-emerald-600'
  if (ev.eventType === 'C') return 'bg-blue-100 text-blue-800 border-l-2 border-l-blue-600'
  return 'bg-amber-100 text-amber-800 border-l-2 border-l-amber-600'
}

export function MonthView({ year, month, events, onDayClick, onEventClick, onMoreClick, onDeleteClick }: MonthViewProps) {
  const todayStr = useMemo(() => toDateStr(new Date()), [])

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()
    const total = Math.ceil((firstDay + daysInMonth) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      if (i < firstDay) {
        let m = month - 1, y = year
        if (m < 0) { m = 11; y-- }
        return { day: daysInPrev - firstDay + 1 + i, month: m, year: y, other: true }
      }
      if (i >= firstDay + daysInMonth) {
        let m = month + 1, y = year
        if (m > 11) { m = 0; y++ }
        return { day: i - firstDay - daysInMonth + 1, month: m, year: y, other: true }
      }
      return { day: i - firstDay + 1, month, year, other: false }
    })
  }, [year, month])

  return (
    <div className="p-3 flex flex-col gap-1">
      {/* Day name row */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DAYS.map(d => (
          <div key={d} className="text-center text-sm font-bold text-[#3031cb] tracking-[0.12em] uppercase py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5" style={{ gridAutoRows: 'minmax(88px, 1fr)' }}>
        {cells.map(({ day, month: m, year: y, other }) => {
          const dateStr = toDateStr(new Date(y, m, day))
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const dayEvts = eventsOnDate(events, dateStr)
          return (
            <div
              key={dateStr}
              onClick={() => !isPast && !other && onDayClick(dateStr)}
              className={cn(
                'rounded-lg border p-1.5 flex flex-col transition-all duration-150',
                other ? 'opacity-30 pointer-events-none' : '',
                isToday ? 'bg-active-accent/5 border-active-accent/40 shadow-sm' : 'bg-surface border-primary-border',
                !isPast && !other ? 'cursor-pointer hover:border-active-accent/30 hover:bg-surface-2' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center shrink-0',
                  isToday ? 'bg-active-accent text-white rounded-full shadow-sm' : 'text-primary-text',
                )}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-h-0">
                {dayEvts.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className={cn(
                      'flex items-center gap-0.5 text-sm rounded-sm font-semibold group',
                      chipCls(ev),
                      evStatus(ev) === 'past' && 'opacity-70 grayscale-20',
                    )}
                  >
                    <span
                      onClick={e => { e.stopPropagation(); onEventClick(String(ev.id)) }}
                      title={ev.title}
                      className="flex-1 truncate cursor-pointer px-1.5 py-0.5"
                    >
                      {fmtEpochTime(ev.startDateTime)} {ev.title}
                    </span>
                    {evStatus(ev) === 'future' && (
                      <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-all gap-0.5">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onEventClick(String(ev.id)) }}
                          className="px-1 py-0.5 hover:text-blue-700 cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onDeleteClick(String(ev.id)) }}
                          className="px-1 py-0.5 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {dayEvts.length > 3 && (
                  <div
                    onClick={e => { e.stopPropagation(); onMoreClick(dateStr) }}
                    className="text-sm text-secondary-text hover:text-active-accent cursor-pointer px-1 transition-colors font-medium"
                  >
                    +{dayEvts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
