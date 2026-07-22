import type { CalendarEvent, EventStatus } from '../../types/event'

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const HOURS = Array.from({ length: 24 }, (_, i) => i)
export const RESOLUTIONS = ['FHD (1080p)', 'HD (720p)', 'SD (480p)', 'SD (360p)', 'SD (180p)', 'SD (120p)']
export const MIN_GAP_SEC = 5 * 60
export const MAX_DUR_SEC = 4 * 3600
export const MAX_DUR_ONGOING_SEC = 12 * 3600

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fmtEpochTime(ep: number): string {
  const d = new Date(ep * 1000)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'PM' : 'AM'}`
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function fmtDuration(secs: number): string {
  if (!secs || secs <= 0) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h === 0 ? `${m}m` : m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function evStatus(ev: CalendarEvent): EventStatus {
  const n = Date.now() / 1000
  if (ev.endDateTime < n) return 'past'
  if (ev.startDateTime <= n && ev.endDateTime > n) return 'ongoing'
  return 'future'
}

/**
 * Returns true if `ev` is the immediate next upcoming event and no other event
 * is currently ongoing or overlapping — i.e. the user is allowed to start it early.
 */
export function isNextEvent(ev: CalendarEvent, allEvents: CalendarEvent[]): boolean {
  const n = Date.now() / 1000
  if (ev.startDateTime <= n) return false                               // already started or past
  if (allEvents.some(e => e.startDateTime <= n && e.endDateTime >= n)) return false  // another event is live
  const nextStart = Math.min(...allEvents.filter(e => e.startDateTime > n).map(e => e.startDateTime))
  return ev.startDateTime === nextStart
}

export function eventsOnDate(events: CalendarEvent[], dStr: string): CalendarEvent[] {
  return events
    .filter(ev => toDateStr(new Date(ev.startDateTime * 1000)) === dStr)
    .sort((a, b) => a.startDateTime - b.startDateTime)
}

export function getWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

export function checkGap(
  events: CalendarEvent[],
  startEpoch: number,
  endEpoch: number,
  excludeId?: string | null,
): string | null {
  const gap = MIN_GAP_SEC
  for (const ev of events) {
    if (excludeId && String(ev.id) === String(excludeId)) continue
    const conflict =
      (startEpoch >= ev.startDateTime - gap && startEpoch < ev.endDateTime + gap) ||
      (endEpoch > ev.startDateTime - gap && endEpoch <= ev.endDateTime + gap) ||
      (startEpoch <= ev.startDateTime - gap && endEpoch >= ev.endDateTime + gap)
    if (conflict) {
      return `Conflict: 5-min gap required around "${ev.title}" (${fmtEpochTime(ev.startDateTime)}–${fmtEpochTime(ev.endDateTime)}).`
    }
  }
  return null
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
