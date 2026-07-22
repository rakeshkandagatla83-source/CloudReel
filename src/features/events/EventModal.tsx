import { X, Plus, Pencil, Eye } from 'lucide-react'
import type { CalendarEvent, ModalState } from '../../types/event'
import { EventForm } from './EventForm'
import { EventDetail } from './EventDetail'
import { evStatus, isNextEvent, toDateStr } from './eventUtils'

interface EventModalProps {
  state: ModalState | null
  events: CalendarEvent[]
  cid: string
  userId: string
  onSave: (payload: Record<string, unknown>, isEdit: boolean, editingId?: string | null) => Promise<{ ok: boolean; error?: string; local?: boolean }>
  onDelete: (id: string) => void
  onDeleteFromDetail: (id: string) => void
  onFetchInstance: () => Promise<{ instanceId: string } | null>
  onStartCloud: (event: CalendarEvent, onStatus: (msg: string) => void) => Promise<{ instanceId: string } | null>
  onCreateMeeting: (eventId: string, bitrate: string, onStatus: (msg: string) => void) => Promise<{ meetingUrl: string; masterUUID: string } | null>
  onGetMeeting: (eventId: string) => Promise<string | null>
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  checkEventQuota?: (startEpoch: number, endEpoch: number) => { canCreate: boolean; reason?: string; hoursNeeded?: number; hoursAvailable?: number }
  meetingHoursUsed?: number
  meetingHoursLimit?: number
  billingPeriodEnd?: Date | null
}

function getDefaultStart(dateStr: string): Date {
  const now = new Date()
  const todayStr = toDateStr(now)
  if (dateStr === todayStr) {
    const d = new Date(now.getTime() + 60_000)
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
    return d
  }
  return new Date(dateStr + 'T09:00:00')
}

export function EventModal({ state, events, cid, userId, onSave, onDelete, onDeleteFromDetail, onFetchInstance, onStartCloud, onCreateMeeting, onGetMeeting, onClose, onEdit, checkEventQuota, meetingHoursUsed, meetingHoursLimit, billingPeriodEnd }: EventModalProps) {
  if (!state) return null

  const viewEvent = state.mode === 'view' ? state.event : null
  const editEvent = state.mode === 'edit' ? state.event : null

  const titleIcon = state.mode === 'create' ? <Plus size={13} /> : state.mode === 'edit' ? <Pencil size={13} /> : <Eye size={13} />
  const titleText = state.mode === 'create' ? 'New Event' : state.mode === 'edit' ? 'Edit Event' : 'Event Details'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"

    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-primary-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary-border bg-surface-2 shrink-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#3031cb]">
            {titleIcon}
            {titleText}
            {viewEvent && evStatus(viewEvent) === 'ongoing' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-400/20 text-[10px] text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            )}
            {viewEvent && evStatus(viewEvent) === 'past' && (
              <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-primary-border text-[10px] text-secondary-text">PAST</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary-text hover:text-primary-text cursor-pointer transition-colors rounded-lg hover:bg-surface-2"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {state.mode === 'create' && (() => {
            const defStart = state.startEpoch ? new Date(state.startEpoch * 1000) : getDefaultStart(state.dateStr)
            const defStartEpoch = Math.floor(defStart.getTime() / 1000)
            const defEndEpoch = defStartEpoch + (state.startEpoch ? 1800 : 3600)
            return (
              <EventForm
                initial={{ startDateTime: defStartEpoch, endDateTime: defEndEpoch }}
                isEdit={false}
                allEvents={events}
                editingId={null}
                cid={cid}
                userId={userId}
                onSave={onSave}
                onCancel={onClose}
                checkEventQuota={checkEventQuota}
                meetingHoursUsed={meetingHoursUsed}
                meetingHoursLimit={meetingHoursLimit}
                billingPeriodEnd={billingPeriodEnd}
              />
            )
          })()}

          {state.mode === 'edit' && editEvent && (
            <EventForm
              initial={editEvent}
              isEdit={true}
              allEvents={events}
              editingId={String(editEvent.id)}
              cid={cid}
              userId={userId}
              onSave={onSave}
              onDelete={() => onDelete(String(editEvent.id))}
              onCancel={onClose}
              checkEventQuota={checkEventQuota}
              meetingHoursUsed={meetingHoursUsed}
              meetingHoursLimit={meetingHoursLimit}
              billingPeriodEnd={billingPeriodEnd}
            />
          )}

          {state.mode === 'view' && viewEvent && (
            <EventDetail
              event={viewEvent}
              status={evStatus(viewEvent)}
              canStartEarly={isNextEvent(viewEvent, events)}
              onFetchInstance={onFetchInstance}
              onCheckCloud={(onStatus) => onStartCloud(viewEvent, onStatus)}
              onCreateMeeting={(bitrate, onStatus) => onCreateMeeting(String(viewEvent.id), bitrate, onStatus)}
              onGetMeeting={onGetMeeting}
              onEdit={() => onEdit(viewEvent)}
              onDelete={() => onDeleteFromDetail(String(viewEvent.id))}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
