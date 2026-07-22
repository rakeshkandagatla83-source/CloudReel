import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays, RotateCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getStorage, setStorage, removeStorage } from '../../lib/storage'
import { getStudioCid, clearEventScopedStudioState } from '../../lib/studioConfig'
import type { CalendarView, ModalState, CalendarEvent } from '../../types/event'
import { useEvents } from './useEvents'
import { useSubscription } from '../../features/subscription/useSubscription'
import { useMeetingHoursUsage } from '../../features/subscription/useMeetingHoursUsage'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { EventModal } from './EventModal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { fmtDuration, getWeekMonday } from './eventUtils'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

function CalendarSkeleton({ view }: { view: CalendarView }) {
  if (view === 'month') {
    return (
      <div className="flex-1 overflow-hidden flex flex-col animate-pulse">
        <div className="grid grid-cols-7 border-b border-primary-border">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 px-3 text-center">
              <div className="h-3 w-6 bg-surface-2 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="border-r border-b border-primary-border p-1.5 flex flex-col gap-1">
              <div className="h-4 w-5 bg-surface-2 rounded self-end" />
              {i % 3 === 0 && <div className="h-3 rounded bg-active-accent/10 w-full" />}
              {i % 5 === 1 && <div className="h-3 rounded bg-blue-100 w-4/5" />}
              {i % 7 === 2 && <div className="h-3 rounded bg-surface-2 w-3/5" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'week') {
    return (
      <div className="flex-1 overflow-hidden flex flex-col animate-pulse">
        <div className="grid grid-cols-8 border-b border-primary-border shrink-0">
          <div className="py-2 px-2">
            <div className="h-3 w-8 bg-surface-2 rounded" />
          </div>
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 px-3 flex flex-col items-center gap-1">
              <div className="h-2.5 w-6 bg-surface-2 rounded" />
              <div className="h-5 w-5 bg-surface-2 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {TIME_SLOTS.map(i => (
            <div key={i} className="grid grid-cols-8 border-b border-primary-border" style={{ height: '52px' }}>
              <div className="px-2 pt-1.5">
                <div className="h-2.5 w-10 bg-surface-2 rounded" />
              </div>
              {DAY_NAMES.map((_, j) => (
                <div key={j} className="border-l border-primary-border relative">
                  {(i * 7 + j) % 11 === 3 && (
                    <div className="absolute inset-x-1 top-1 h-8 rounded bg-active-accent/10" />
                  )}
                  {(i * 7 + j) % 13 === 7 && (
                    <div className="absolute inset-x-1 top-1 h-6 rounded bg-blue-100" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // day view
  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-pulse">
      <div className="shrink-0 border-b border-primary-border px-4 py-2">
        <div className="h-4 w-40 bg-surface-2 rounded" />
      </div>
      <div className="flex-1 overflow-hidden flex">
        <div className="w-14 shrink-0 border-r border-primary-border">
          {TIME_SLOTS.map(i => (
            <div key={i} className="flex justify-end pr-2 pt-1.5" style={{ height: '56px' }}>
              <div className="h-2.5 w-8 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          {TIME_SLOTS.map(i => (
            <div key={i} className="border-b border-primary-border" style={{ height: '56px' }} />
          ))}
          <div className="absolute top-16 left-3 right-3 h-20 rounded bg-active-accent/10" />
          <div className="absolute top-44 left-3 right-3 h-12 rounded bg-blue-100" />
        </div>
      </div>
    </div>
  )
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

export function EventsCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [day, setDay] = useState(now.getDate())
  const [view, setView] = useState<CalendarView>(
    () => (getStorage<CalendarView>('pcr_cal_view') ?? 'month'),
  )

  const routerNavigate = useNavigate()
  const changeView = useCallback((v: CalendarView) => {
    setView(v)
    setStorage('pcr_cal_view', v)
  }, [])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [goLivePendingId, setGoLivePendingId] = useState<string | null>(null)
  const { events, loading, cid, userId, fetchEvents, saveEvent, deleteEvent, fetchInstance, startInstanceFlow, createMeetingUrlForEvent, getMeetingForEvent, checkEventQuota: checkEventQuotaHelper } = useEvents()

  // Subscription quota checks
  const { planLimits, billingPeriodEnd } = useSubscription()
  const meetingHours = useMeetingHoursUsage()

  const checkEventQuota = useCallback(
    (startEpoch: number, endEpoch: number) => {
      if (!planLimits) return { canCreate: false, reason: 'no-subscription' }
      return checkEventQuotaHelper(startEpoch, endEpoch, planLimits, meetingHours.hoursUsed)
    },
    [planLimits, meetingHours.hoursUsed, checkEventQuotaHelper],
  )

  useEffect(() => { fetchEvents(year, month) }, [fetchEvents, year, month])

  function navigate(dir: number) {
    if (view === 'month') {
      const next = new Date(year, month + dir, 1)
      setYear(next.getFullYear()); setMonth(next.getMonth())
    } else {
      const d = new Date(year, month, day)
      d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1))
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate())
      fetchEvents(d.getFullYear(), d.getMonth())
    }
  }

  function goToday() {
    const n = new Date()
    setYear(n.getFullYear()); setMonth(n.getMonth()); setDay(n.getDate())
  }

  const navLabel = useMemo(() => {
    if (view === 'month') return new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    if (view === 'week') {
      const mon = getWeekMonday(new Date(year, month, day))
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6)
      return `${mon.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${sun.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return new Date(year, month, day).toLocaleString('default', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  }, [view, year, month, day])

  const viewEvents = useMemo(() => {
    let s: number, e: number
    if (view === 'day') {
      s = new Date(year, month, day, 0, 0, 0).getTime() / 1000
      e = new Date(year, month, day, 23, 59, 59).getTime() / 1000
    } else if (view === 'week') {
      const mon = getWeekMonday(new Date(year, month, day))
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6)
      s = mon.getTime() / 1000
      e = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59).getTime() / 1000
    } else {
      s = new Date(year, month, 1).getTime() / 1000
      e = new Date(year, month + 1, 0, 23, 59, 59).getTime() / 1000
    }
    return events.filter(ev => ev.startDateTime >= s && ev.startDateTime <= e)
  }, [events, view, year, month, day])

  const totalSecs = useMemo(
    () => viewEvents.reduce((s, e) => s + Math.max(0, e.endDateTime - e.startDateTime), 0),
    [viewEvents],
  )

  const openCreate = useCallback(
    (dateStr: string, startEpoch?: number) => setModal({ mode: 'create', dateStr, startEpoch }),
    [],
  )
  const openView = useCallback((id: string) => {
    const ev = events.find(e => String(e.id) === id)
    if (ev) setModal({ mode: 'view', event: ev })
  }, [events])
  const openMore = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    setYear(y); setMonth(m - 1); setDay(d); changeView('day')
  }, [changeView, setYear, setMonth, setDay])

  const openDeleteConfirm = useCallback((id: string) => {
    const ev = events.find(e => String(e.id) === id)
    setDeleteConfirm({ id, title: ev?.title ?? 'this event' })
  }, [events])

  async function handleGoLiveClick(ev: CalendarEvent) {
    setGoLivePendingId(String(ev.id))
    try {
      // Enhancement 3: check instance is running before proceeding
      const instance = await fetchInstance()
      if (!instance) {
        openView(String(ev.id))
        return
      }
      // Enhancement 1: check meeting exists; if not, fall back to EventDetail for creation
      const masterUUID = await getMeetingForEvent(String(ev.id))
      if (!masterUUID) {
        openView(String(ev.id))
        return
      }
      // Clear stale meeting URL and previous event's scoped studio state
      removeStorage('studio_meeting_url')
      const previousEventId = getStorage<string>('studio_event_id')
      const cid = getStudioCid()
      if (cid && previousEventId != null && String(previousEventId) !== String(ev.id)) {
        clearEventScopedStudioState(cid, String(previousEventId))
      }
      setStorage('studio_event_id', String(ev.id))
      setStorage('studio_event_title', ev.title)
      if (ev.description) setStorage('studio_event_description', ev.description)
      if (ev.thumbnailUrl) setStorage('studio_event_thumbnail', ev.thumbnailUrl)
      routerNavigate('/studio', { state: { fromGoLive: true, masterUUID } })
    } finally {
      setGoLivePendingId(null)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return
    await deleteEvent(deleteConfirm.id)
    setDeleteConfirm(null)
    setModal(null)
  }

  async function handleSave(payload: Record<string, unknown>, isEdit: boolean, editingId?: string | null) {
    const result = await saveEvent(payload, isEdit, editingId)
    if (result.ok) {
      await fetchEvents(year, month, true)
      setModal(null)
    }
    return result
  }

  async function handleDelete(id: string) {
    await deleteEvent(id)
    setModal(null)
  }

  const STAT_PILLS = [
    { label: 'Events', val: viewEvents.length, cls: 'border-[#3031cb]/22 text-[#3031cb]' },
    { label: 'Total', val: fmtDuration(totalSecs), cls: 'border-emerald-400/18 text-emerald-400' },
    { label: 'Conf.', val: viewEvents.filter(e => e.eventType === 'C').length, cls: 'border-blue-400/18 text-blue-400' },
    { label: 'Other', val: viewEvents.filter(e => e.eventType === 'O').length, cls: 'border-amber-400/18 text-amber-400' },
  ]

  return (
    <div className="flex flex-col h-full bg-primary-bg">
      {/* Header */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-primary-border">
        <div className="flex items-center gap-2 text-primary-text">
          <CalendarDays size={18} className="text-[#3031cb]" />
          <span className="text-base font-semibold tracking-wide">Event Calendar</span>
          {/* {loading && <Loader2 size={11} className="animate-spin text-white/25" />} */}
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={goToday} className="flex h-10 items-center justify-center px-4 text-base border border-[#3031cb]/22 bg-[#3031cb]/7 text-[#3031cb] rounded-lg hover:bg-[#3031cb]/14 cursor-pointer transition-colors">
            Today
          </button>
          <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-primary-text min-w-48 text-center select-none">{navLabel}</span>
          <button type="button" onClick={() => navigate(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 bg-primary-bg border border-primary-border rounded-lg p-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => changeView(v.key)}
              className={cn(
                'flex h-10 items-center px-4 rounded-md text-base font-medium cursor-pointer transition-all',
                view === v.key ? 'bg-active-accent/10 text-active-accent shadow-sm' : 'text-secondary-text hover:text-primary-text hover:bg-surface-2',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => fetchEvents(year, month, true)}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Refresh events"
        >
          <RotateCw size={16} className={cn(loading && 'animate-spin')} />
        </button>

        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {STAT_PILLS.map(({ label, val, cls }) => (
            <div key={label} className={cn('flex h-10 items-center gap-2 px-3 rounded-full bg-surface border text-base', cls)}>
              <span className="text-secondary-text">{label}</span>
              <span className="font-semibold">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading && events.length === 0 ? (
          <CalendarSkeleton view={view} />
        ) : (
          <>
            {view === 'month' && (
              <div className="flex-1 overflow-y-auto">
                <MonthView year={year} month={month} events={events} onDayClick={openCreate} onEventClick={openView} onMoreClick={openMore} onDeleteClick={openDeleteConfirm} />
              </div>
            )}
            {view === 'week' && (
              <WeekView year={year} month={month} day={day} events={events} onDayClick={openCreate} onEventClick={openView} onDeleteClick={openDeleteConfirm} />
            )}
            {view === 'day' && (
              <DayView year={year} month={month} day={day} events={events} onNewEvent={openCreate} onEventClick={openView} onDeleteClick={openDeleteConfirm} onGoLiveClick={handleGoLiveClick} goLivePendingId={goLivePendingId} />
            )}
          </>
        )}
      </div>

      <EventModal
        state={modal}
        events={events}
        cid={cid}
        userId={userId}
        onSave={handleSave}
        onDelete={handleDelete}
        onDeleteFromDetail={openDeleteConfirm}
        onFetchInstance={fetchInstance}
        onStartCloud={(event: CalendarEvent, onStatus) => startInstanceFlow(event, onStatus)}
        onCreateMeeting={(eventId, bitrate, onStatus) => createMeetingUrlForEvent(eventId, bitrate, onStatus)}
        onGetMeeting={getMeetingForEvent}
        onClose={() => setModal(null)}
        onEdit={(ev: CalendarEvent) => setModal({ mode: 'edit', event: ev })}
        checkEventQuota={checkEventQuota}
        meetingHoursUsed={meetingHours.hoursUsed}
        meetingHoursLimit={meetingHours.limit}
        billingPeriodEnd={billingPeriodEnd}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={open => { if (!open) setDeleteConfirm(null) }}
        title="Delete event?"
        description={`"${deleteConfirm?.title ?? ''}" will be permanently deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  )
}
