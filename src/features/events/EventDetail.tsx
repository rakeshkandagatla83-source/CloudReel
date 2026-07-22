import { useState, useEffect } from 'react'
import { Play, Loader2, Video, Bookmark, Radio, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { getStorage, setStorage, removeStorage } from '../../lib/storage'
import { getStudioCid, clearEventScopedStudioState } from '../../lib/studioConfig'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CreateMeetingDialog } from './CreateMeetingDialog'
import type { CalendarEvent, EventStatus } from '../../types/event'
import { fmtDateTime, fmtDuration } from './eventUtils'

type InstanceState = 'checking' | 'starting' | 'none' | 'ready' | 'create_meeting'

interface EventDetailProps {
  event: CalendarEvent
  status: EventStatus
  canStartEarly?: boolean
  onFetchInstance: () => Promise<{ instanceId: string } | null>
  onCheckCloud: (onStatus: (msg: string) => void) => Promise<{ instanceId: string } | null>
  onCreateMeeting: (bitrate: string, onStatus: (msg: string) => void) => Promise<{ meetingUrl: string; masterUUID: string } | null>
  onGetMeeting: (eventId: string) => Promise<string | null>
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EventDetail({ event, status, canStartEarly, onFetchInstance, onCheckCloud, onCreateMeeting, onGetMeeting, onEdit, onDelete, onClose }: EventDetailProps) {
  const navigate = useNavigate()
  const [instanceState, setInstanceState] = useState<InstanceState>(() =>
    status === 'ongoing' ? 'checking' : 'none'
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [meetingCreating, setMeetingCreating] = useState(false)
  const [meetingStatus, setMeetingStatus] = useState('')
  const [instanceError, setInstanceError] = useState<string | null>(null)

  const canStart = status === 'ongoing' || canStartEarly
  const isBusy = instanceState === 'checking' || instanceState === 'starting' || meetingCreating

  useEffect(() => {
    if (status !== 'ongoing') return
    onFetchInstance().then(async result => {
      if (!result) { setInstanceState('none'); return }
      const masterUUID = await onGetMeeting(String(event.id))
      setInstanceState(masterUUID ? 'ready' : 'create_meeting')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartEvent() {
    setInstanceState('checking')
    setInstanceError(null)
    const result = await onCheckCloud(msg => setInstanceError(msg))
    if (result) {
      const masterUUID = await onGetMeeting(String(event.id))
      setInstanceState(masterUUID ? 'ready' : 'create_meeting')
      return
    }
    setInstanceState('none')
  }

  async function handleCreateMeeting(bitrate: string) {
    setMeetingCreating(true)
    setMeetingStatus('')
    const result = await onCreateMeeting(bitrate, msg => setMeetingStatus(msg))
    if (result) {
      handleGoLive(result.masterUUID)
    } else {
      setMeetingCreating(false)
    }
  }

  function handleGoLive(masterUUID?: string) {
    removeStorage('studio_meeting_url')
    const previousEventId = getStorage<string>('studio_event_id')
    const cid = getStudioCid()
    if (cid && previousEventId != null && String(previousEventId) !== String(event.id)) {
      clearEventScopedStudioState(cid, String(previousEventId))
    }
    setStorage('studio_event_id', String(event.id))
    setStorage('studio_event_title', event.title)
    if (event.description) setStorage('studio_event_description', event.description)
    if (event.thumbnailUrl) setStorage('studio_event_thumbnail', event.thumbnailUrl)
    onClose()
    navigate('/studio', { state: { fromGoLive: true, ...(masterUUID ? { masterUUID } : {}) } })
  }

  const fields: Array<[string, React.ReactNode]> = [
    [
      'Type',
      event.eventType === 'C'
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-400/20 text-xs font-semibold"><Video size={10} /> Conference</span>
        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/25 text-amber-400 border border-amber-400/20 text-xs font-semibold"><Bookmark size={10} /> Other</span>,
    ],
    ...(event.eventType === 'C' && event.resolution ? [['Resolution', event.resolution] as [string, React.ReactNode]] : []),
    ['Start', fmtDateTime(new Date(event.startDateTime * 1000))],
    ['End', fmtDateTime(new Date(event.endDateTime * 1000))],
    ['Duration', fmtDuration(event.endDateTime - event.startDateTime)],
  ]

  return (
    <div className="flex flex-col gap-3 p-4">
      {canStart && (
        <>
          {/* Status banner */}
          {status === 'ongoing' ? (
            <div className="rounded-lg bg-emerald-900/20 border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300/80">
              This event is currently <span className="font-bold text-emerald-400">LIVE</span>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-900/20 border border-amber-400/20 px-3 py-2 text-xs text-amber-300/80">
              Scheduled for <span className="font-bold text-amber-400">{fmtDateTime(new Date(event.startDateTime * 1000))}</span> — you can start early
            </div>
          )}

          {/* Checking / Starting instance */}
          {(instanceState === 'checking' || instanceState === 'starting') && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-secondary-text">
              <Loader2 size={12} className="animate-spin" />
              {instanceState === 'checking' ? 'Checking cloud instance…' : 'Starting cloud instance…'}
            </div>
          )}

          {/* Instance error */}
          {instanceState === 'none' && instanceError && (
            <div className="rounded-lg bg-red-900/20 border border-red-400/20 px-3 py-2 text-xs text-red-300/80">
              {instanceError}
            </div>
          )}

          {/* Start Event button */}
          {instanceState === 'none' && (
            <button
              type="button"
              onClick={handleStartEvent}
              className={cn(
                'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all',
                status === 'ongoing'
                  ? 'bg-linear-to-r from-[#3031cb] to-[#a00812] hover:from-[#f01020] hover:to-[#2626a8] text-white shadow-[0_0_16px_rgba(48,49,203,0.3)]'
                  : 'bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.25)]',
              )}
            >
              <Play size={14} />
              {status === 'ongoing' ? 'START EVENT' : 'START EVENT EARLY'}
            </button>
          )}

          <CreateMeetingDialog
            open={instanceState === 'create_meeting'}
            creating={meetingCreating}
            statusMsg={meetingStatus}
            onConfirm={handleCreateMeeting}
            onCancel={() => { setInstanceState('none'); setMeetingStatus('') }}
          />

          {/* GO LIVE button (instance already running from previous session) */}
          {instanceState === 'ready' && (
            <button
              type="button"
              onClick={() => handleGoLive()}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all bg-linear-to-r from-[#3031cb] to-[#a00812] hover:from-[#f01020] hover:to-[#2626a8] text-white shadow-[0_0_16px_rgba(48,49,203,0.3)]"
            >
              <Radio size={14} /> GO LIVE — STUDIO
            </button>
          )}
        </>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wider text-secondary-text">Event Title</label>
        <div className="mt-1 bg-surface border border-primary-border rounded-lg px-3 py-2 text-sm text-primary-text">{event.title}</div>
      </div>

      {fields.map(([label, value]) => (
        <div key={String(label)}>
          <label className="text-[10px] uppercase tracking-wider text-secondary-text">{label}</label>
          <div className="mt-1 bg-surface border border-primary-border rounded-lg px-3 py-2 text-sm text-secondary-text">{value}</div>
        </div>
      ))}

      {event.description && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-secondary-text">Description</label>
          <div className="mt-1 bg-surface border border-primary-border rounded-lg px-3 py-2 text-sm text-secondary-text whitespace-pre-wrap">{event.description}</div>
        </div>
      )}

      {event.thumbnailUrl && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-secondary-text">Thumbnail</label>
          <img src={event.thumbnailUrl} alt="thumbnail" className="mt-1 w-full max-h-36 object-cover rounded-xl border border-white/8" />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/6">
        {status === 'future' && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-400/20 bg-red-900/15 hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors mr-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
        {status !== 'past' && (
          <button type="button" onClick={onEdit} disabled={isBusy} className="px-4 py-1.5 text-xs font-semibold bg-[#3031cb] hover:bg-[#2626a8] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Edit
          </button>
        )}
        <button type="button" onClick={onClose} disabled={isBusy} className="px-4 py-1.5 text-xs text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Close
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete event?"
        description={`"${event.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onDelete}
      />
    </div>
  )
}
