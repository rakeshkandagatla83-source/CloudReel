import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/event'
import { DAYS, toDateStr, eventsOnDate, evStatus, fmtEpochTime, fmtDuration, getWeekMonday } from './eventUtils'

interface WeekViewProps {
  year: number
  month: number
  day: number
  events: CalendarEvent[]
  onDayClick: (dateStr: string) => void
  onEventClick: (id: string) => void
  onDeleteClick: (id: string) => void
}

function cardCls(ev: CalendarEvent): string {
  const st = evStatus(ev)
  if (st === 'ongoing') return 'bg-emerald-100 border-l-emerald-600 text-emerald-800'
  if (ev.eventType === 'C') return 'bg-blue-100 border-l-blue-600 text-blue-800'
  return 'bg-amber-100 border-l-amber-600 text-amber-800'
}

export function WeekView({ year, month, day, events, onDayClick, onEventClick, onDeleteClick }: WeekViewProps) {
  const [, setTimeTick] = useState(0)
  const todayStr = useMemo(() => toDateStr(new Date()), [])

  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  const weekDays = useMemo(() => {
    const monday = getWeekMonday(new Date(year, month, day))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [year, month, day])

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3 gap-0.5">
      {/* Header row */}
      <div
        className="grid gap-px shrink-0 rounded-t-xl overflow-hidden border border-primary-border"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {weekDays.map(d => {
          const dStr = toDateStr(d)
          const isToday = dStr === todayStr
          const isPast = dStr < todayStr
          return (
            <div key={d.toISOString()} id={`week-header-day-${dStr}`} className="bg-surface py-2.5 px-2 flex items-center justify-between gap-1">
              <div className="flex flex-col items-center flex-1">
                <div className="text-sm font-bold text-[#3031cb] tracking-[0.12em] uppercase">
                  {DAYS[d.getDay()]}
                </div>
                <div
                  className={cn(
                    'text-base font-bold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full',
                    isToday ? 'bg-active-accent text-white shadow-sm' : 'text-primary-text',
                  )}
                >
                  {d.getDate()}
                </div>
              </div>
              {!isPast && (
                <button
                  id={`week-btn-add-event-${dStr}`}
                  type="button"
                  onClick={() => onDayClick(dStr)}
                  className="shrink-0 p-1 rounded-md text-secondary-text hover:text-primary-text hover:bg-surface-2 transition-colors cursor-pointer"
                  aria-label={`Add event on ${dStr}`}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Body columns */}
      <div
        className="grid gap-px flex-1 min-h-0 overflow-y-auto rounded-b-xl border border-t-0 border-primary-border bg-surface"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {weekDays.map(d => {
          const dStr = toDateStr(d)
          const isToday = dStr === todayStr
          const isPast = dStr < todayStr
          const dayEvts = eventsOnDate(events, dStr)
          return (
            <div
              key={dStr}
              onClick={() => !isPast && onDayClick(dStr)}
              className={cn(
                'bg-surface p-2 flex flex-col gap-1.5 min-h-64',
                isToday && 'bg-active-accent/5',
                !isPast ? 'cursor-pointer hover:bg-surface-2 transition-colors' : 'cursor-default',
              )}
            >
              {!dayEvts.length && (
                <span className="text-sm text-secondary-text text-center pt-4 select-none">No events</span>
              )}
              {dayEvts.map(ev => (
                <div
                  key={ev.id}
                  className={cn(
                    'rounded-md px-2 py-1.5 border-l-2 group',
                    cardCls(ev),
                    evStatus(ev) === 'past' && 'opacity-70 grayscale-20',
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={e => { e.stopPropagation(); onEventClick(String(ev.id)) }}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="text-sm opacity-80 truncate">
                          {fmtEpochTime(ev.startDateTime)}–{fmtEpochTime(ev.endDateTime)}
                        </span>
                        {evStatus(ev) === 'ongoing' && (
                          <span className="flex items-center gap-1 shrink-0 text-xs text-emerald-700 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold truncate mt-0.5">{ev.title}</div>
                      <div className="text-sm opacity-70 mt-0.5">{fmtDuration(ev.endDateTime - ev.startDateTime)}</div>
                    </div>
                    {evStatus(ev) === 'future' && (
                      <div className="flex flex-col items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onEventClick(String(ev.id)) }}
                          className="p-0.5 hover:text-blue-700 cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onDeleteClick(String(ev.id)) }}
                          className="p-0.5 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
