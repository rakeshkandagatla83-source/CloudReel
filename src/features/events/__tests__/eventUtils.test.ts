import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toDateStr, toTimeStr, fmtEpochTime, fmtDuration,
  evStatus, isNextEvent, eventsOnDate, checkGap, uid,
} from '../eventUtils'
import type { CalendarEvent } from '../../../types/event'

const makeEvent = (id: string | number, start: number, end: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: String(id),
  title: `Event ${id}`,
  description: '',
  startDateTime: start,
  endDateTime: end,
  eventType: 'O',
  resolution: '',
  thumbnailUrl: '',
  createdAt: start,
  ...overrides,
})

// ── toDateStr ─────────────────────────────────────────────────────────────────

describe('toDateStr', () => {
  it('zero-pads month and day to YYYY-MM-DD', () => {
    expect(toDateStr(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(toDateStr(new Date(2025, 11, 31))).toBe('2025-12-31')
  })

  it('handles double-digit month and day', () => {
    expect(toDateStr(new Date(2025, 9, 15))).toBe('2025-10-15')
  })
})

// ── toTimeStr ─────────────────────────────────────────────────────────────────

describe('toTimeStr', () => {
  it('formats to HH:MM with zero-padding', () => {
    expect(toTimeStr(new Date(2025, 0, 1, 9, 5))).toBe('09:05')
    expect(toTimeStr(new Date(2025, 0, 1, 14, 30))).toBe('14:30')
  })

  it('handles midnight (00:00)', () => {
    expect(toTimeStr(new Date(2025, 0, 1, 0, 0))).toBe('00:00')
  })
})

// ── fmtEpochTime ──────────────────────────────────────────────────────────────

describe('fmtEpochTime', () => {
  it('formats afternoon hours as PM', () => {
    const d = new Date(2025, 0, 1, 15, 30)
    expect(fmtEpochTime(d.getTime() / 1000)).toBe('3:30PM')
  })

  it('formats morning hours as AM', () => {
    const d = new Date(2025, 0, 1, 9, 5)
    expect(fmtEpochTime(d.getTime() / 1000)).toBe('9:05AM')
  })

  it('formats noon as 12:00PM', () => {
    const d = new Date(2025, 0, 1, 12, 0)
    expect(fmtEpochTime(d.getTime() / 1000)).toBe('12:00PM')
  })

  it('formats midnight as 12:00AM', () => {
    const d = new Date(2025, 0, 1, 0, 0)
    expect(fmtEpochTime(d.getTime() / 1000)).toBe('12:00AM')
  })
})

// ── fmtDuration ───────────────────────────────────────────────────────────────

describe('fmtDuration', () => {
  it('returns "0m" for 0 seconds', () => {
    expect(fmtDuration(0)).toBe('0m')
  })

  it('returns "0m" for negative seconds', () => {
    expect(fmtDuration(-60)).toBe('0m')
  })

  it('returns minutes only when under 1 hour', () => {
    expect(fmtDuration(45 * 60)).toBe('45m')
    expect(fmtDuration(5 * 60)).toBe('5m')
  })

  it('returns hours only when minutes are zero', () => {
    expect(fmtDuration(2 * 3600)).toBe('2h')
  })

  it('returns hours and minutes when both are nonzero', () => {
    expect(fmtDuration(2 * 3600 + 30 * 60)).toBe('2h 30m')
    expect(fmtDuration(1 * 3600 + 1 * 60)).toBe('1h 1m')
  })
})

// ── evStatus ──────────────────────────────────────────────────────────────────

describe('evStatus', () => {
  const NOW = 1_700_000_000

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW * 1000) })
  afterEach(() => vi.useRealTimers())

  it('returns "past" when end is before now', () => {
    expect(evStatus(makeEvent('1', NOW - 7200, NOW - 3600))).toBe('past')
  })

  it('returns "ongoing" when now is between start and end', () => {
    expect(evStatus(makeEvent('2', NOW - 600, NOW + 600))).toBe('ongoing')
  })

  it('returns "future" when start is after now', () => {
    expect(evStatus(makeEvent('3', NOW + 3600, NOW + 7200))).toBe('future')
  })

  it('returns "ongoing" at exact start boundary (start === now)', () => {
    expect(evStatus(makeEvent('4', NOW, NOW + 3600))).toBe('ongoing')
  })

  it('returns "past" when end is just before now', () => {
    expect(evStatus(makeEvent('5', NOW - 7200, NOW - 1))).toBe('past')
  })
})

// ── isNextEvent ───────────────────────────────────────────────────────────────

describe('isNextEvent', () => {
  const NOW = 1_700_000_000

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW * 1000) })
  afterEach(() => vi.useRealTimers())

  it('returns false if the event has already started', () => {
    const ev = makeEvent('1', NOW - 100, NOW + 3600)
    expect(isNextEvent(ev, [ev])).toBe(false)
  })

  it('returns false if another event is currently live', () => {
    const live = makeEvent('live', NOW - 600, NOW + 600)
    const upcoming = makeEvent('next', NOW + 1800, NOW + 5400)
    expect(isNextEvent(upcoming, [live, upcoming])).toBe(false)
  })

  it('returns true if it is the next upcoming event with no ongoing event', () => {
    const next = makeEvent('next', NOW + 1800, NOW + 5400)
    expect(isNextEvent(next, [next])).toBe(true)
  })

  it('returns false if it is not the soonest upcoming event', () => {
    const sooner = makeEvent('sooner', NOW + 900, NOW + 4500)
    const later = makeEvent('later', NOW + 1800, NOW + 5400)
    expect(isNextEvent(later, [sooner, later])).toBe(false)
  })

  it('returns true for the soonest of multiple future events', () => {
    const sooner = makeEvent('sooner', NOW + 900, NOW + 4500)
    const later = makeEvent('later', NOW + 1800, NOW + 5400)
    expect(isNextEvent(sooner, [sooner, later])).toBe(true)
  })

  it('returns false when allEvents list is empty', () => {
    // Math.min(...[]) = Infinity, so ev.startDateTime !== Infinity
    const ev = makeEvent('1', NOW + 3600, NOW + 7200)
    expect(isNextEvent(ev, [])).toBe(false)
  })

  it('ignores past events when finding the next upcoming', () => {
    const past = makeEvent('past', NOW - 7200, NOW - 3600)
    const next = makeEvent('next', NOW + 1800, NOW + 5400)
    expect(isNextEvent(next, [past, next])).toBe(true)
  })
})

// ── eventsOnDate ──────────────────────────────────────────────────────────────

describe('eventsOnDate', () => {
  it('returns only events whose start date matches dStr', () => {
    const match = makeEvent('1', new Date(2025, 5, 15, 10, 0).getTime() / 1000, new Date(2025, 5, 15, 11, 0).getTime() / 1000)
    const other = makeEvent('2', new Date(2025, 5, 16, 10, 0).getTime() / 1000, new Date(2025, 5, 16, 11, 0).getTime() / 1000)
    const result = eventsOnDate([match, other], '2025-06-15')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns events sorted ascending by startDateTime', () => {
    const base = new Date(2025, 5, 15, 0, 0).getTime() / 1000
    const late = makeEvent('late', base + 7200, base + 10800)
    const early = makeEvent('early', base + 3600, base + 7200)
    const result = eventsOnDate([late, early], '2025-06-15')
    expect(result[0].id).toBe('early')
    expect(result[1].id).toBe('late')
  })

  it('returns empty array when no events match the date', () => {
    const ev = makeEvent('1', new Date(2025, 5, 20, 10, 0).getTime() / 1000, new Date(2025, 5, 20, 11, 0).getTime() / 1000)
    expect(eventsOnDate([ev], '2025-06-15')).toHaveLength(0)
  })

  it('returns empty array when events list is empty', () => {
    expect(eventsOnDate([], '2025-06-15')).toHaveLength(0)
  })
})

// ── checkGap ──────────────────────────────────────────────────────────────────

describe('checkGap', () => {
  const BASE = 1_700_000_000

  // Existing event: BASE → BASE+3600
  const existing = makeEvent('existing', BASE, BASE + 3600, { title: 'Existing' })

  it('returns null when new event respects the 5-min gap after the existing one', () => {
    const result = checkGap([existing], BASE + 3600 + 301, BASE + 3600 + 1800)
    expect(result).toBeNull()
  })

  it('returns null when no events are present', () => {
    expect(checkGap([], BASE, BASE + 3600)).toBeNull()
  })

  it('returns an error string when new event overlaps an existing one', () => {
    const result = checkGap([existing], BASE + 1800, BASE + 5400)
    expect(result).toContain('Conflict')
    expect(result).toContain('Existing')
  })

  it('returns an error when new event violates the 5-min gap after end', () => {
    // Only 100s after end — less than the 300s gap
    const result = checkGap([existing], BASE + 3600 + 100, BASE + 3600 + 1800)
    expect(result).toContain('Conflict')
  })

  it('returns an error when new event is within 5-min gap before start', () => {
    const result = checkGap([existing], BASE - 200, BASE - 100)
    expect(result).toContain('Conflict')
  })

  it('returns null when the conflicting event is excluded by id', () => {
    const result = checkGap([existing], BASE + 1800, BASE + 5400, 'existing')
    expect(result).toBeNull()
  })

  it('skips the excluded event when id types differ (string vs number)', () => {
    const numId = makeEvent(1, BASE, BASE + 3600, { title: 'NumId' }) // id becomes '1'
    const result = checkGap([numId], BASE + 1800, BASE + 5400, '1')
    expect(result).toBeNull()
  })
})

// ── uid ───────────────────────────────────────────────────────────────────────

describe('uid', () => {
  it('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string')
    expect(uid().length).toBeGreaterThan(0)
  })

  it('returns unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()))
    expect(ids.size).toBe(50)
  })
})
