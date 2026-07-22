import { useState, useRef } from 'react'
import { AlertCircle, Image, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { UpgradeModal } from '../../components/ui/UpgradeModal'
import { Select, SelectItem } from '../../components/ui/Select'
import type { CalendarEvent } from '../../types/event'
import { createClientUpload } from '../../lib/s3Service'
import {
  RESOLUTIONS, MIN_GAP_SEC, MAX_DUR_SEC, MAX_DUR_ONGOING_SEC,
  toDateStr, toTimeStr, fmtDateTime, checkGap,
} from './eventUtils'

interface EventFormProps {
  initial: { startDateTime: number; endDateTime: number } & Partial<CalendarEvent>
  isEdit: boolean
  allEvents: CalendarEvent[]
  editingId?: string | null
  cid: string
  userId: string
  onSave: (payload: Record<string, unknown>, isEdit: boolean, editingId?: string | null) => Promise<{ ok: boolean; error?: string; local?: boolean }>
  onDelete?: () => void
  onCancel: () => void
  checkEventQuota?: (startEpoch: number, endEpoch: number) => { canCreate: boolean; reason?: string; hoursNeeded?: number; hoursAvailable?: number }
  meetingHoursUsed?: number
  meetingHoursLimit?: number
  billingPeriodEnd?: Date | null
}

function addMins(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const inputCls = 'w-full bg-surface border border-primary-border rounded-lg px-3 py-2 text-base text-primary-text focus:outline-none focus:border-[#3031cb]/50 transition-colors disabled:opacity-40 min-h-10'
const dateTimeCls = 'w-full cursor-pointer outline-hidden'

interface TimeSelectProps {
  value: string
  onChange: (v: string) => void
  minTime?: string
  disabled?: boolean
}

function TimeSelect({ value, onChange, minTime, disabled }: TimeSelectProps) {
  const [hh, mm] = value.split(':').map(Number)
  const minHH = minTime ? parseInt(minTime.split(':')[0]) : 0
  const minMM = minTime ? parseInt(minTime.split(':')[1]) : 0

  const hours = Array.from({ length: 24 }, (_, i) => i).filter(h => !minTime || h >= minHH)
  const minutes = Array.from({ length: 60 }, (_, i) => i).filter(m =>
    !minTime || hh > minHH || m >= minMM,
  )

  function update(newH: number, newM: number) {
    const clampedM = minTime && newH === minHH && newM < minMM ? minMM : newM
    onChange(`${String(newH).padStart(2, '0')}:${String(clampedM).padStart(2, '0')}`)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={String(hh)} onValueChange={v => update(Number(v), mm)} disabled={disabled} className="flex-1">
        {hours.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}</SelectItem>)}
      </Select>
      <span className="text-secondary-text font-bold select-none">:</span>
      <Select value={String(mm)} onValueChange={v => update(hh, Number(v))} disabled={disabled} className="flex-1">
        {minutes.map(m => <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>)}
      </Select>
    </div>
  )
}

export function EventForm({ initial, isEdit, allEvents, editingId, cid, userId, onSave, onDelete, onCancel, checkEventQuota, meetingHoursUsed, meetingHoursLimit, billingPeriodEnd }: EventFormProps) {
  const n = Date.now() / 1000
  const isOngoing = isEdit && initial.startDateTime! <= n && initial.endDateTime! >= n
  const isFuture = isEdit && !isOngoing && initial.startDateTime! > n

  const startDT = new Date(initial.startDateTime! * 1000)
  const endDT = new Date(initial.endDateTime! * 1000)

  const [title, setTitle] = useState(initial.title ?? '')
  const [titleTouched, setTitleTouched] = useState(false)
  const [desc, setDesc] = useState(initial.description ?? '')
  const [sDate, setSDate] = useState(toDateStr(startDT))
  const [sDateTouched, setSDateTouched] = useState(false)
  const [eDate, setEDate] = useState(toDateStr(endDT))
  const [eDateTouched, setEDateTouched] = useState(false)
  const [sTime, setSTime] = useState(toTimeStr(startDT))
  const [eTime, setETime] = useState(toTimeStr(endDT))
  const [evType, setEvType] = useState<'C' | 'O'>(initial.eventType ?? 'O')
  const [resolution, setResolution] = useState(initial.resolution ?? RESOLUTIONS[0])
  const [thumbPreview, setThumbPreview] = useState(initial.thumbnailUrl ?? '')
  const [thumbS3Url, setThumbS3Url] = useState(initial.thumbnailUrl ?? '')
  const [thumbUploading, setThumbUploading] = useState(false)
  const [thumbUploadError, setThumbUploadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalReason, setQuotaModalReason] = useState<'no-subscription' | 'insufficient-hours' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) { setError('Only PNG/JPG allowed.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return }
    setError('')
    setThumbUploadError('')

    const r = new FileReader()
    r.onload = ev => setThumbPreview(ev.target!.result as string)
    r.readAsDataURL(file)

    setThumbUploading(true)
    const handle = createClientUpload(file, undefined, 'thumbnail')
    try {
      const url = await handle.done()
      setThumbS3Url(url)
    } catch (err) {
      setThumbUploadError(err instanceof Error ? err.message : 'Thumbnail upload failed')
    } finally {
      setThumbUploading(false)
    }
  }

  async function handleSubmit() {
    setError('')
    setTitleTouched(true)
    if (!title.trim()) { setError('Event title is required.'); return }
    const nowEpoch = Math.floor(Date.now() / 1000)
    let startEpoch: number, endEpoch: number

    if (isOngoing) {
      startEpoch = initial.startDateTime!
      endEpoch = Math.floor(new Date(`${eDate}T${eTime}`).getTime() / 1000)
      if (endEpoch <= nowEpoch) { setError('End time must be in the future.'); return }
      if (endEpoch <= startEpoch + 300) { setError('End must be at least 5 min after start.'); return }
      const maxEnd = initial.startDateTime! + MAX_DUR_ONGOING_SEC
      if (endEpoch > maxEnd) {
        setError(`Max 12 hrs from start (${fmtDateTime(new Date(maxEnd * 1000))}).`)
        return
      }
    } else {
      startEpoch = Math.floor(new Date(`${sDate}T${sTime}`).getTime() / 1000)
      endEpoch = Math.floor(new Date(`${eDate}T${eTime}`).getTime() / 1000)
      if (startEpoch < nowEpoch) { setError('Start cannot be in the past.'); return }
      if (endEpoch <= startEpoch) { setError('End must be after start.'); return }
      if (endEpoch - startEpoch < MIN_GAP_SEC) { setError('Min duration is 5 minutes.'); return }
      if (endEpoch - startEpoch > MAX_DUR_SEC) { setError('Max duration is 4 hours.'); return }
      const gapErr = checkGap(allEvents, startEpoch, endEpoch, isEdit ? editingId : null)
      if (gapErr) { setError(gapErr); return }
    }

    // Check quota if not editing
    if (!isEdit && checkEventQuota) {
      const quotaCheck = checkEventQuota(startEpoch, endEpoch)
      if (!quotaCheck.canCreate) {
        setQuotaModalReason(quotaCheck.reason === 'no-subscription' ? 'no-subscription' : 'insufficient-hours')
        setQuotaModalOpen(true)
        return
      }
    }

    const nowTs = Math.floor(Date.now() / 1000)
    const finalThumb = thumbS3Url
    const payload: Record<string, unknown> = {
      cid: Number(cid), createdBy: Number(userId), updatedBy: Number(userId),
      title: title.trim(), description: desc.trim(),
      startDateTime: startEpoch, endDateTime: endEpoch,
      createdAt: isEdit ? (initial.createdAt ?? nowTs) : nowTs, updatedAt: nowTs,
      thumbnailUrl: finalThumb, eventType: evType,
      resolution: evType === 'C' ? resolution : '',
      ...(isEdit && editingId ? { Sno: Number(editingId) } : {}),
    }
    setSaving(true)
    const result = await onSave(payload, isEdit, isEdit ? editingId : null)
    setSaving(false)
    if (!result.ok) { setError(result.error ?? 'Failed to save.'); return }
    if (result.local) setError('Saved locally (API unreachable).')
  }

  const maxEnd = initial.startDateTime ? new Date((initial.startDateTime + MAX_DUR_ONGOING_SEC) * 1000) : null

  return (
    <div className="flex flex-col gap-3 p-4">
      {isOngoing && (
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-400/20 px-4 py-3 text-base text-emerald-300/90">
          This event is currently <span className="font-bold text-emerald-400">LIVE</span>. Only end time can be extended (max 12 hrs from start).
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-base uppercase tracking-wider text-secondary-text font-semibold">
          Event Title <span className="text-[#3031cb]">*</span>
        </label>
        <input
          className={cn(inputCls, titleTouched && !title.trim() && 'border-red-500/60 focus:border-red-500/70')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => setTitleTouched(true)}
          placeholder="Enter event title"
          disabled={isOngoing}
        />
        {titleTouched && !title.trim() && (
          <p className="text-sm text-red-400/80">Event title is required.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-base uppercase tracking-wider text-secondary-text font-semibold">Description</label>
        <textarea className={cn(inputCls, 'resize-y min-h-14 font-[inherit]')} value={desc} onChange={e => setDesc(e.target.value)} disabled={isOngoing} />
      </div>

      <div className="flex items-stretch gap-2">
        {/* Start group */}
        <div className="flex-1 flex flex-col gap-2 bg-surface-2 border border-primary-border rounded-xl p-3">
          <span className="text-base uppercase tracking-wider text-[#3031cb]/80 font-bold">
            Start <span className="text-[#3031cb]">*</span>
          </span>
          <div className="flex flex-col gap-1.5">
            <label className="text-base text-secondary-text font-semibold">Date</label>
            <input
              type="date"
              className={cn(dateTimeCls, sDateTouched && !sDate && 'border-red-500/60')}
              value={sDate}
              min={toDateStr(new Date())}
              disabled={isEdit && !isFuture}
              onBlur={() => setSDateTouched(true)}
              onChange={e => {
                const nd = e.target.value
                setSDate(nd)
                const today = toDateStr(new Date())
                const nowT = toTimeStr(new Date())
                // clamp sTime if switching to today and it's now in the past
                const newSTime = (nd === today && sTime < nowT) ? nowT : sTime
                if (newSTime !== sTime) setSTime(newSTime)
                // push eDate forward if it would be before new sDate
                if (nd > eDate) {
                  setEDate(nd)
                  // also push eTime to sTime+30 since we're now on the same date
                  setETime(addMins(newSTime, 30))
                } else if (nd === eDate && eTime <= newSTime) {
                  setETime(addMins(newSTime, 30))
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-base text-secondary-text font-semibold">Time</label>
            <TimeSelect
              value={sTime}
              minTime={sDate === toDateStr(new Date()) ? toTimeStr(new Date()) : undefined}
              disabled={isEdit && !isFuture}
              onChange={val => {
                setSTime(val)
                // push eTime forward if end is on the same date and now <= start
                if (eDate === sDate && eTime <= val) setETime(addMins(val, 30))
              }}
            />
          </div>
        </div>

        {/* Arrow divider */}
        <div className="flex items-center shrink-0 text-secondary-text/60 text-lg select-none">→</div>

        {/* End group */}
        <div className="flex-1 flex flex-col gap-2 bg-surface-2 border border-primary-border rounded-xl p-3">
          <span className="text-base uppercase tracking-wider text-secondary-text font-bold">
            End <span className="text-[#3031cb]">*</span>
          </span>
          <div className="flex flex-col gap-1.5">
            <label className="text-base text-secondary-text font-semibold">Date</label>
            <input
              type="date"
              className={cn(dateTimeCls, eDateTouched && !eDate && 'border-red-500/60')}
              value={eDate}
              min={sDate >= toDateStr(new Date()) ? sDate : toDateStr(new Date())}
              disabled={isOngoing}
              onBlur={() => setEDateTouched(true)}
              onChange={e => {
                const nd = e.target.value
                setEDate(nd)
                // if end date moved to same day as start and eTime <= sTime, push eTime
                if (nd === sDate && eTime <= sTime) setETime(addMins(sTime, 30))
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-base text-secondary-text font-semibold">Time</label>
            <TimeSelect
              value={eTime}
              onChange={setETime}
              minTime={
                eDate === sDate
                  ? sTime
                  : eDate === toDateStr(new Date()) ? toTimeStr(new Date()) : undefined
              }
            />
          </div>
        </div>
      </div>

      {isOngoing && maxEnd && (
        <div className="flex items-center gap-2 text-sm text-secondary-text bg-surface-2 rounded-lg px-3 py-2 border border-primary-border">
          <AlertCircle size={12} className="shrink-0" />
          Max end time: <span className="text-primary-text">{fmtDateTime(maxEnd)}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-base uppercase tracking-wider text-secondary-text font-semibold">Event Type</label>
        <Select value={evType} onValueChange={v => setEvType(v as 'C' | 'O')} disabled={isOngoing} className="w-full">
          <SelectItem value="O">Other</SelectItem>
          <SelectItem value="C">Conference</SelectItem>
        </Select>
      </div>

      {evType === 'C' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-base uppercase tracking-wider text-secondary-text font-semibold">Meeting Resolution</label>
          <Select value={resolution} onValueChange={setResolution} disabled={isOngoing} className="w-full">
            {RESOLUTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-base uppercase tracking-wider text-secondary-text font-semibold flex items-center gap-1.5">
          <Image size={15} /> Thumbnail <span className="text-secondary-text normal-case">(PNG/JPG · max 5MB)</span>
        </label>
        <div
          className="border-2 border-dashed border-primary-border hover:border-[#3031cb]/50 bg-surface-2 rounded-xl p-3 text-center cursor-pointer transition-colors"
          onClick={() => !isOngoing && !thumbUploading && fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={handleThumbChange} disabled={isOngoing} />
          {thumbUploading ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <Loader2 size={18} className="animate-spin text-[#3031cb]" />
              <p className="text-base text-secondary-text">Uploading thumbnail…</p>
            </div>
          ) : (
            <>
              <p className="text-base text-secondary-text">{thumbPreview ? 'Click to change thumbnail' : 'Click or drag PNG/JPG'}</p>
              {thumbPreview && <img src={thumbPreview} alt="thumb" className="mt-2 w-full max-h-24 object-cover rounded-lg" />}
            </>
          )}
        </div>
        {thumbUploadError && (
          <p className="text-sm text-amber-400">{thumbUploadError} — thumbnail will not be saved.</p>
        )}
      </div>

      {error && <p className="text-base text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-white/6">
        {isEdit && !isOngoing && onDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-base text-red-400 border border-red-400/20 bg-red-900/15 hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors mr-auto">
            Delete
          </button>
        )}
        <button type="button" onClick={onCancel} className="px-4 py-2 text-base text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 cursor-pointer transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={isEdit ? () => setConfirmSave(true) : handleSubmit}
          disabled={saving || thumbUploading}
          className="px-4 py-2 text-base font-semibold bg-[#3031cb] hover:bg-[#2626a8] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50"
        >
          {thumbUploading ? 'Uploading…' : saving ? 'Saving…' : isOngoing ? 'Extend Duration' : isEdit ? 'Save Changes' : 'Create Event'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save changes?"
        description="Are you sure you want to update this event?"
        confirmLabel="Save Changes"
        onConfirm={handleSubmit}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete event?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onDelete!}
      />

      <UpgradeModal
        id="event-form-quota-modal"
        open={quotaModalOpen}
        onOpenChange={setQuotaModalOpen}
        featureType={quotaModalReason === 'no-subscription' ? 'no-subscription' : 'meeting-hours'}
        customTitle={quotaModalReason === 'no-subscription' ? 'Subscription Required' : undefined}
        customSubtitle={quotaModalReason === 'no-subscription' ? 'You need an active subscription to create and schedule events.' : undefined}
        used={quotaModalReason === 'no-subscription' ? undefined : meetingHoursUsed ?? 0}
        limit={quotaModalReason === 'no-subscription' ? undefined : meetingHoursLimit ?? 0}
        unit={quotaModalReason === 'no-subscription' ? undefined : 'hours'}
        resetDate={quotaModalReason === 'no-subscription' ? undefined : billingPeriodEnd?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      />
    </div>
  )
}
