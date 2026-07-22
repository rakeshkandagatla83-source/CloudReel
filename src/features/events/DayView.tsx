import { useEffect, useRef, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Radio, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/event'
import { HOURS, toDateStr, eventsOnDate, evStatus, fmtEpochTime, fmtDuration } from './eventUtils'

const HOUR_HEIGHT = 64 // px per hour
const SLOT_MINS = 30   // minutes per clickable slot

interface DayViewProps {
  year: number
  month: number
  day: number
  events: CalendarEvent[]
  onNewEvent: (dateStr: string, startEpoch?: number) => void
  onEventClick: (id: string) => void
  onDeleteClick: (id: string) => void
  onGoLiveClick: (ev: CalendarEvent) => void
  goLivePendingId?: string | null
}

interface SlotPreview {
  hour: number       // slot boundary (0 or 30) — used for card position + end time display
  minute: number
  topPx: number
  startHour: number  // actual event start (may be snapped to next 5-min mark)
  startMinute: number
}

function cardCls(ev: CalendarEvent): string {
  const st = evStatus(ev)
  if (st === 'ongoing') return 'bg-emerald-100 border-l-emerald-600 text-emerald-800'
  if (ev.eventType === 'C') return 'bg-blue-100 border-l-blue-600 text-blue-800'
  return 'bg-amber-100 border-l-amber-600 text-amber-800'
}

function nowPx(): number {
  const n = new Date()
  return (n.getHours() * 60 + n.getMinutes()) * (HOUR_HEIGHT / 60)
}

function fmtSlot(h: number, m: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${dh}:${String(m).padStart(2, '0')} ${period}`
}

export function DayView({ year, month, day, events, onNewEvent, onEventClick, onDeleteClick, onGoLiveClick, goLivePendingId }: DayViewProps) {
  const tlRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const [slotPreview, setSlotPreview] = useState<SlotPreview | null>(null)
  const [, setTimeTick] = useState(0)

  const dStr = toDateStr(new Date(year, month, day))
  const todayStr = useMemo(() => toDateStr(new Date()), [])
  const isToday = dStr === todayStr
  const isPast = dStr < todayStr

  const dayEvts = useMemo(
    () => eventsOnDate(events, dStr).sort((a, b) => a.startDateTime - b.startDateTime),
    [events, dStr],
  )

  useEffect(() => {
    if (!isToday) return

    function updateLine() {
      if (!lineRef.current) return
      lineRef.current.style.top = `${nowPx()}px`
      setTimeTick(t => t + 1)
    }

    updateLine()
    if (tlRef.current) {
      tlRef.current.scrollTop = Math.max(0, nowPx() - 120)
    }

    const timer = setInterval(updateLine, 60_000)
    return () => clearInterval(timer)
  }, [isToday])

  // Close preview when date changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSlotPreview(null) }, [dStr])

  function isSlotOccupied(h: number, m: number): boolean {
    const slotStart = new Date(year, month, day, h, m, 0).getTime() / 1000
    const slotEnd = slotStart + SLOT_MINS * 60
    return dayEvts.some(ev => ev.startDateTime < slotEnd && ev.endDateTime > slotStart)
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isPast) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-event]')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const fractional = clickY / HOUR_HEIGHT
    const clickedHour = Math.min(Math.floor(fractional), 23)
    const clickedMinute = (fractional - clickedHour) * 60 < 30 ? 0 : 30

    let finalHour = clickedHour
    let finalMinute = clickedMinute

    if (isSlotOccupied(clickedHour, clickedMinute)) {
      const altMinute = clickedMinute === 0 ? 30 : 0
      const altHour = clickedMinute === 30 ? Math.min(clickedHour + 1, 23) : clickedHour
      if (!isSlotOccupied(altHour, altMinute)) {
        finalHour = altHour
        finalMinute = altMinute
      }
    }

    let startHour = finalHour
    let startMinute = finalMinute

    if (isToday) {
      const slotStartMs = new Date(year, month, day, finalHour, finalMinute, 0).getTime()
      const slotEndMs = slotStartMs + SLOT_MINS * 60 * 1000
      const nowMs = Date.now()

      if (slotEndMs <= nowMs) return  // entire slot is past

      if (slotStartMs <= nowMs) {
        // Partial slot — snap start to next 5-minute mark
        const snappedMs = Math.ceil(nowMs / (5 * 60 * 1000)) * (5 * 60 * 1000)
        if (snappedMs >= slotEndMs) return  // no room left after snapping
        const snapped = new Date(snappedMs)
        startHour = snapped.getHours()
        startMinute = snapped.getMinutes()
      }
    }

    const cardTopPx = finalHour * HOUR_HEIGHT + finalMinute * (HOUR_HEIGHT / 60)
    setSlotPreview({ hour: finalHour, minute: finalMinute, topPx: cardTopPx, startHour, startMinute })
  }

  function handleConfirmCreate() {
    if (!slotPreview) return
    const startEpoch = Math.floor(
      new Date(year, month, day, slotPreview.startHour, slotPreview.startMinute, 0).getTime() / 1000,
    )
    setSlotPreview(null)
    onNewEvent(dStr, startEpoch)
  }

  const dayDate = new Date(year, month, day)
  const totalSecs = dayEvts.reduce((s, e) => s + Math.max(0, e.endDateTime - e.startDateTime), 0)

  // Compute per-event layout: pixel position + column assignment to avoid div overlap
  const eventLayouts = useMemo(() => {
    const PX = HOUR_HEIGHT / 60

    const layouts = dayEvts.map(ev => {
      const start = new Date(ev.startDateTime * 1000)
      const startMins = start.getHours() * 60 + start.getMinutes()
      const topPx = startMins * PX
      const durationMins = (ev.endDateTime - ev.startDateTime) / 60
      const rawHeight = durationMins * PX
      // actualBottom = real end time in px (never inflated by min-height)
      const actualBottom = topPx + Math.max(rawHeight, 0)
      const isTiny = rawHeight < HOUR_HEIGHT
      return { ev, topPx, startMins, rawHeight, actualBottom, heightPx: 0, isTiny, col: 0, totalCols: 1 }
    })

    // Column assignment using ACTUAL end time so min-height doesn't force unrelated events narrow
    const colActualEnds: number[] = []
    for (const l of layouts) {
      let placed = false
      for (let c = 0; c < colActualEnds.length; c++) {
        if (l.topPx >= colActualEnds[c]) {
          l.col = c
          colActualEnds[c] = l.actualBottom
          placed = true
          break
        }
      }
      if (!placed) {
        l.col = colActualEnds.length
        colActualEnds.push(l.actualBottom)
      }
    }

    // totalCols = max column index + 1 among events that actually overlap in real time
    for (const l of layouts) {
      let maxCol = l.col
      for (const other of layouts) {
        if (l.topPx < other.actualBottom && l.actualBottom > other.topPx) {
          maxCol = Math.max(maxCol, other.col)
        }
      }
      l.totalCols = maxCol + 1
    }

    // Final rendered height: cap the 24px minimum so it never crosses
    //   (a) the next event's start in the same column, or
    //   (b) the next hour grid line when the event actually ends before it
    for (let i = 0; i < layouts.length; i++) {
      const l = layouts[i]

      const nextInCol = layouts.slice(i + 1).find(o => o.col === l.col)
      const nextEventGap = nextInCol ? nextInCol.topPx - l.topPx : Infinity

      // Next whole-hour boundary from this event's start
      const nextHourMins = (Math.floor(l.startMins / 60) + 1) * 60
      const nextHourPx = nextHourMins * PX
      const hourGap = l.actualBottom <= nextHourPx ? nextHourPx - l.topPx : Infinity

      const maxGap = Math.min(nextEventGap, hourGap)
      l.heightPx = maxGap === Infinity
        ? Math.max(l.rawHeight, 24)
        : Math.max(l.rawHeight, Math.min(24, maxGap))
    }

    return layouts
  }, [dayEvts])

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
      {/* Day header */}
      <div className="shrink-0 flex items-center justify-between bg-surface rounded-xl px-5 py-3 border border-primary-border">
        <div>
          <div className="text-sm font-semibold text-primary-text">
            {dayDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-sm text-secondary-text mt-0.5">
            {dayEvts.length} event{dayEvts.length !== 1 ? 's' : ''} · {fmtDuration(totalSecs)} total
          </div>
        </div>
        {!isPast && (
          <button
            type="button"
            onClick={() => onNewEvent(dStr)}
            className="flex items-center gap-1.5 h-10 px-4 bg-active-accent hover:bg-active-accent/90 text-white text-base font-semibold rounded-lg cursor-pointer transition-colors"
          >
            <Plus size={16} />
            New Event
          </button>
        )}
      </div>

      {/* Timeline */}
      <div ref={tlRef} className="flex-1 overflow-y-auto">
        <div
          className={cn('relative', !isPast && 'cursor-pointer')}
          style={{ height: HOURS.length * HOUR_HEIGHT }}
          onClick={handleTimelineClick}
        >
          {/* Current time line */}
          {isToday && (
            <div
              ref={lineRef}
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
            >
              <div className="absolute left-0 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}

          {/* Hour grid rows */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-primary-border"
              style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="absolute left-0 w-14 pr-2 -top-2.5 text-right text-sm text-secondary-text select-none">
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </span>
            </div>
          ))}

          {/* Slot preview confirmation card */}
          {slotPreview && (
            <div
              className="absolute z-20 bg-surface border border-primary-border rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2"
              style={{ top: slotPreview.topPx + 4, left: '4rem', minWidth: '220px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary-text">
                  {fmtSlot(slotPreview.startHour, slotPreview.startMinute)}
                  {' – '}
                  {fmtSlot(
                    Math.floor((slotPreview.startHour * 60 + slotPreview.startMinute + 30) / 60) % 24,
                    (slotPreview.startHour * 60 + slotPreview.startMinute + 30) % 60,
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setSlotPreview(null)}
                  className="p-0.5 text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="w-full h-10 rounded-lg bg-active-accent hover:bg-active-accent/90 text-white text-base font-semibold cursor-pointer transition-colors"
              >
                Create Event
              </button>
            </div>
          )}

          {/* Events — absolutely positioned by time */}
          {eventLayouts.map(({ ev, topPx, heightPx, isTiny, col, totalCols }) => {
            return (
              <div
                key={ev.id}
                data-event="1"
                className={cn(
                  'absolute rounded-lg border-l-2 group overflow-hidden cursor-pointer',
                  cardCls(ev),
                  evStatus(ev) === 'past' && 'opacity-70 grayscale-20',
                )}
                style={{
                  top: topPx,
                  height: heightPx,
                  left: `calc(3.75rem + ${col} * (100% - 4.25rem) / ${totalCols})`,
                  right: `calc(0.5rem + ${totalCols - col - 1} * (100% - 4.25rem) / ${totalCols})`,
                }}
                onClick={e => { e.stopPropagation(); onEventClick(String(ev.id)) }}
              >
                <div className={cn('flex justify-between gap-2 h-full px-3', isTiny ? 'items-center py-0' : 'items-start py-1')}>
                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {isTiny ? (
                      <div className="flex items-center gap-1.5 truncate">
                        {evStatus(ev) === 'ongoing' && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          </span>
                        )}
                        <span className="text-sm opacity-70 shrink-0">
                          {fmtEpochTime(ev.startDateTime)}–{fmtEpochTime(ev.endDateTime)}
                        </span>
                        <span className="text-sm font-bold truncate">{ev.title}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm opacity-80 truncate">
                            {fmtEpochTime(ev.startDateTime)} – {fmtEpochTime(ev.endDateTime)} · {fmtDuration(ev.endDateTime - ev.startDateTime)}
                          </span>
                          {evStatus(ev) === 'ongoing' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-600/30 text-xs text-emerald-700 font-bold shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-base font-bold truncate mt-0.5">{ev.title}</div>
                        {ev.description && (
                          <div className="text-sm opacity-70 mt-0.5 truncate">{ev.description}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row items-center gap-0 shrink-0">
                    {evStatus(ev) === 'ongoing' && (
                      <button
                        type="button"
                        disabled={goLivePendingId === String(ev.id)}
                        onClick={e => {
                          e.stopPropagation()
                          onGoLiveClick(ev)
                        }}
                        className={cn(
                          'flex items-center gap-1.5 h-10 px-3 rounded-md font-bold text-white bg-active-accent hover:bg-active-accent/90 cursor-pointer transition-colors shrink-0 text-base',
                          goLivePendingId === String(ev.id) && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        {goLivePendingId === String(ev.id)
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Radio size={14} />
                        }
                        GO LIVE
                      </button>
                    )}
                    {evStatus(ev) === 'future' && (
                      <div className="flex flex-row items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          className="p-1.5 hover:text-blue-700 cursor-pointer rounded"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onDeleteClick(String(ev.id)) }}
                          className="p-1.5 hover:text-red-600 cursor-pointer rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
