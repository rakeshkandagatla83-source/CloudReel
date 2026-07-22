import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Play, Square, Trash2, Plus, Copy, ExternalLink, Grid2x2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { getStorage, setStorage } from '../../lib/storage'
import { DestinationModal } from './DestinationModal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SocialPublishPanel } from './SocialPublishPanel'
import { MatrixModal } from './MatrixModal'
import type { Destination } from '../../types/studio'

function DestCard({ dest, onStart, onStop, onDelete }: {
  dest: Destination
  onStart: () => Promise<boolean>
  onStop: () => Promise<boolean>
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [apiMsg, setApiMsg] = useState('')
  const [apiType, setApiType] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleStart() {
    setApiMsg('Starting...'); setApiType('loading')
    const success = await onStart()
    setApiMsg(success ? `✓ Live — ${new Date().toLocaleTimeString()}` : 'Start failed')
    setApiType(success ? 'ok' : 'err')
  }

  async function handleStop() {
    setApiMsg('Stopping...'); setApiType('loading')
    await onStop()
    setApiMsg('■ Stopped'); setApiType('ok')
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden transition-colors', dest.streaming ? 'border-[#3031cb]/30 bg-active-accent/5' : 'border-primary-border bg-surface')}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold shrink-0 border"
          style={{ background: dest.color + '15', borderColor: dest.color + '30', color: dest.color }}
        >
          {dest.icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[11px] text-primary-text font-semibold truncate">{dest.name}</div>
          <div className="text-[9px] text-secondary-text">{dest.platform}</div>
        </div>
        <div className={cn('w-2 h-2 rounded-full shrink-0', dest.streaming ? 'bg-active-accent animate-pulse shadow-sm' : 'bg-secondary-text')} />
        {open ? <ChevronUp size={10} className="text-secondary-text shrink-0" /> : <ChevronDown size={10} className="text-secondary-text shrink-0" />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border">
          <div className="flex flex-col gap-0.5 mt-2 mb-2">
            {(dest.fieldDefs || []).map(f => {
              const val = dest.fields[f.key] || '—'
              const display = f.type === 'password' && val !== '—' ? '••••••' : val
              return (
                <div key={f.key} className="text-[9px] text-secondary-text">
                  <b className="text-primary-text">{f.label}:</b> {display}
                </div>
              )
            })}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={handleStart} disabled={dest.streaming}
              className="flex-1 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-800 font-bold text-[11px] cursor-pointer transition-all flex items-center justify-center gap-1">
              <Play size={10} /> Start
            </button>
            <button type="button" onClick={handleStop} disabled={!dest.streaming}
              className="flex-1 py-1.5 rounded-lg bg-active-accent hover:bg-active-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[11px] cursor-pointer transition-all flex items-center justify-center gap-1">
              <Square size={10} /> Stop
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="px-2.5 py-1.5 rounded-lg border border-primary-border bg-surface-2 text-secondary-text hover:text-active-accent hover:border-active-accent/30 hover:bg-active-accent/5 cursor-pointer transition-colors">
              <Trash2 size={10} />
            </button>
          </div>
          {apiMsg && (
            <div className={cn('mt-1.5 text-[9px] text-center px-2 py-1 rounded', apiType === 'ok' ? 'text-emerald-700 bg-emerald-100' : apiType === 'err' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100')}>
              {apiMsg}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete destination?"
        description={`"${dest.name}" will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onDelete}
      />
    </div>
  )
}

function MeetingUrlPanel() {
  const { meetingUrl, channel, participants, sendCellChange, sendMatrixChange } = useStudioCtx()
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [collapsed, setCollapsed] = useState(() => getStorage<boolean>('studio_meeting_collapsed') ?? false)
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false)
  const hostUserId = getStorage<string>('pcr_user_id') ?? ''

  useEffect(() => { setStorage('studio_meeting_collapsed', collapsed) }, [collapsed])

  const masterUUID = (() => {
    if (!meetingUrl) return ''
    try { return new URL(meetingUrl).searchParams.get('id') ?? '' } catch { return '' }
  })()

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
  }

  function handleCopy() {
    copyToClipboard(meetingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyId() {
    copyToClipboard(masterUUID)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className="bg-surface border border-primary-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        <h4 className="text-[10px] text-secondary-text font-semibold uppercase tracking-wider">Meeting Host URL</h4>
        {collapsed ? <ChevronDown size={12} className="text-secondary-text" /> : <ChevronUp size={12} className="text-secondary-text" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {meetingUrl ? (
            <>
              <div className="text-[9px] text-secondary-text bg-surface-2 border border-primary-border rounded px-2 py-1.5 break-all leading-relaxed">
                {meetingUrl}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1',
                    copied
                      ? 'border-emerald-600/30 bg-emerald-100 text-emerald-700'
                      : 'border-primary-border bg-surface-2 text-secondary-text hover:bg-surface-2/80 hover:text-primary-text',
                  )}
                >
                  <Copy size={9} /> {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy master UUID"
                  className={cn(
                    'flex-1 py-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1',
                    copiedId
                      ? 'border-emerald-600/30 bg-emerald-100 text-emerald-700'
                      : 'border-primary-border bg-surface-2 text-secondary-text hover:bg-surface-2/80 hover:text-primary-text',
                  )}
                >
                  <Copy size={9} /> {copiedId ? 'Copied!' : 'Copy ID'}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(meetingUrl, '_blank')}
                  className="flex-1 py-1.5 rounded-lg border border-[#3031cb]/25 bg-[#3031cb]/8 text-[#3031cb] text-[10px] font-semibold cursor-pointer hover:bg-[#3031cb]/15 transition-all flex items-center justify-center gap-1"
                >
                  <ExternalLink size={9} /> Open
                </button>
              </div>
              <button
                id="studio-btn-matrix"
                type="button"
                onClick={() => setIsMatrixModalOpen(true)}
                className="w-full py-1.5 rounded-lg border border-primary-border bg-surface-2 text-secondary-text text-[10px] font-semibold cursor-pointer hover:bg-surface-2/80 hover:text-primary-text transition-all flex items-center justify-center gap-1.5"
              >
                <Grid2x2 size={9} /> Matrix Control
              </button>
            </>
          ) : (
            <p className="text-[10px] text-secondary-text text-center py-1">No meeting URL — start an event to generate one.</p>
          )}
        </div>
      )}

      <MatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        channelId={channel ?? ''}
        hostUserId={hostUserId}
        participants={participants}
        sendCellChange={sendCellChange}
        sendMatrixChange={sendMatrixChange}
      />
    </div>
  )
}

export function PublishPanel() {
  const { destinations, startDestination, stopDestination, deleteDestination } = useStudioCtx()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 p-2">
        {/* Meeting Host URL */}
        <MeetingUrlPanel />

        {/* Stream Destinations */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-secondary-text uppercase tracking-wider">Stream Destinations</span>
          <button
            id="studio-btn-add-destination"
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg border border-[#3031cb]/25 bg-[#3031cb]/6 text-[#3031cb]/80 hover:bg-[#3031cb]/12 cursor-pointer transition-colors"
          >
            <Plus size={9} /> Add
          </button>
        </div>

        {destinations.length === 0 && (
          <p id="studio-destinations-empty" className="text-[10px] text-secondary-text text-center py-1">
            No destinations yet — click Add to configure a stream.
          </p>
        )}

        {destinations.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {destinations.map(d => (
              <DestCard
                key={d.id}
                dest={d}
                onStart={() => startDestination(d.id)}
                onStop={() => stopDestination(d.id)}
                onDelete={() => deleteDestination(d.id)}
              />
            ))}
          </div>
        )}

        <DestinationModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>

      {/* Social Publishing */}
      <SocialPublishPanel />
    </div>
  )
}
