import { useState, useRef, useEffect } from 'react'
import { X, Volume2, VolumeX, Search, ChevronDown, Check, MonitorPlay, GripVertical, SlidersHorizontal, RotateCcw, Repeat, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import { Select, SelectItem } from '../../components/ui/Select'
import { getVideoBase } from '../../lib/studioConfig'
import type { SourceSlot, SourceType, RtmpSource, VideoAsset, VirtualSource } from '../../types/studio'

const VOD_SEARCH_THRESHOLD = 5
const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  webrtc: 'text-sky-400 border-sky-500/30 bg-sky-500/8',
  rtmp: 'text-violet-400 border-violet-500/30 bg-violet-500/8',
  vod: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/8',
}

interface Props {
  rowIdx: number
  slotIdx: number
  slot: SourceSlot
  participants: string[]
  virtualSources: VirtualSource[]
  rtmpSources: RtmpSource[]
  videoAssets: VideoAsset[]
  usedValues: string[]
  disabledTypes: SourceType[]
  isLoadingVideoAssets?: boolean
  onUpdate: (patch: Partial<SourceSlot>) => void
  onRemove: () => void
  openVideoPopup: (name: string, url: string) => void
  onVolumeChange: (volume: number) => void
  onTransformChange: (patch: Partial<Pick<SourceSlot, 'panX' | 'panY' | 'zoom'>>) => void
  onShowToast: (title: string, description: string) => void
  isActive?: boolean
  isDragging?: boolean
  isDragDisabled?: boolean
}

export function SourceSlotRow({ rowIdx, slotIdx, slot, participants, virtualSources, rtmpSources, videoAssets, usedValues, disabledTypes, isLoadingVideoAssets, onUpdate, onVolumeChange, onTransformChange, onRemove, openVideoPopup, onShowToast, isActive, isDragging, isDragDisabled }: Props) {
  const slotId = `studio-source-${rowIdx}-${slotIdx}`

  const [vodOpen, setVodOpen] = useState(false)
  const [vodSearch, setVodSearch] = useState('')
  const [vodPos, setVodPos] = useState({ top: 0, left: 0, width: 0 })
  const vodRef = useRef<HTMLDivElement>(null)
  const vodTriggerRef = useRef<HTMLButtonElement>(null)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [controlsPos, setControlsPos] = useState({ top: 0, left: 0 })
  const controlsRef = useRef<HTMLDivElement>(null)
  const controlsBtnRef = useRef<HTMLButtonElement>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [pendingPatch, setPendingPatch] = useState<Partial<SourceSlot> | null>(null)
  const [activeChangeConfirmOpen, setActiveChangeConfirmOpen] = useState(false)

  useEffect(() => {
    if (!vodOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (vodRef.current && !vodRef.current.contains(e.target as Node)) {
        setVodOpen(false)
        setVodSearch('')
      }
    }
    function handleScroll(e: Event) {
      if (vodRef.current?.contains(e.target as Node)) return
      setVodOpen(false)
      setVodSearch('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [vodOpen])

  useEffect(() => {
    if (!controlsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) setControlsOpen(false)
    }
    function handleScroll() { setControlsOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [controlsOpen])

  const isVirtualSlot = virtualSources.some(v => v.id === slot.sourceValue)
  const showTransformControls = !!slot.sourceType
  const connectedVirtualSources = virtualSources.filter(v => participants.includes(v.sourceUserId))
  const isStaleWebrtcSlot =
    slot.sourceType === 'webrtc' &&
    !!slot.sourceValue &&
    !participants.includes(slot.sourceValue) &&
    !virtualSources.some(v => v.id === slot.sourceValue)

  const showVodSearch = videoAssets.length > VOD_SEARCH_THRESHOLD
  const filteredVodAssets = showVodSearch
    ? videoAssets.filter(v => v.name.toLowerCase().includes(vodSearch.toLowerCase()))
    : videoAssets

  function handleTypeChange(newType: string) {
    setControlsOpen(false)
    if (isActive && slot.sourceValue) {
      setPendingPatch({ sourceType: newType as SourceType | '', sourceValue: '', volume: 100, panX: 0, panY: 0, zoom: 1, loop: false })
      setActiveChangeConfirmOpen(true)
      return
    }
    setVodOpen(false)
    setVodSearch('')
    onUpdate({ sourceType: newType as SourceType | '', sourceValue: '', volume: 100, panX: 0, panY: 0, zoom: 1, loop: false })
  }

  function handleValueChange(newValue: string) {
    if (isActive && slot.sourceValue && newValue !== slot.sourceValue) {
      if (newValue && slot.sourceType === 'webrtc' && !participants.includes(newValue) && !connectedVirtualSources.some(v => v.id === newValue)) {
        onShowToast('Source unavailable', `"${newValue}" is no longer connected.`)
        return
      }
      if (newValue && slot.sourceType === 'rtmp' && !rtmpSources.some(s => s.name === newValue)) {
        onShowToast('Source unavailable', `RTMP stream "${newValue}" is no longer active.`)
        return
      }
      setPendingPatch({ sourceValue: newValue })
      setActiveChangeConfirmOpen(true)
      return
    }
    onUpdate({ sourceValue: newValue })
  }

  function handleVodValueChange(newValue: string) {
    setVodOpen(false)
    setVodSearch('')
    if (isActive && slot.sourceValue && newValue !== slot.sourceValue) {
      setPendingPatch({ sourceValue: newValue })
      setActiveChangeConfirmOpen(true)
      return
    }
    onUpdate({ sourceValue: newValue })
  }

  return (
    <div id={slotId} className={cn('flex items-center gap-1', isDragging && 'pointer-events-none')}>
        {/* Drag handle */}
        <div
          id={`${slotId}-drag-handle`}
          className={cn(
            'shrink-0 text-white/20',
            isDragDisabled
              ? 'invisible'
              : 'cursor-grab hover:text-white/50 active:cursor-grabbing',
          )}
        >
          <GripVertical size={12} />
        </div>
        {/* Source type */}
        <Select
          value={slot.sourceType}
          onValueChange={handleTypeChange}
          className={cn(
            'w-32 shrink-0',
            slot.sourceType ? SOURCE_TYPE_COLORS[slot.sourceType as SourceType] : '',
          )}
        >
          <SelectItem value="">-- Type --</SelectItem>
          <SelectItem value="webrtc">WebRTC</SelectItem>
          <SelectItem value="rtmp" disabled={disabledTypes.includes('rtmp')}>RTMP</SelectItem>
          <SelectItem value="vod" disabled={disabledTypes.includes('vod')}>VOD</SelectItem>
        </Select>

        {/* Source value */}
        <div id={`${slotId}-source`} className="flex-1 min-w-0">
          {slot.sourceType === 'webrtc' && (
            <div className="flex items-center gap-1 w-full">
              <Select
                value={slot.sourceValue}
                onValueChange={handleValueChange}
                className={cn(
                  'w-full',
                  isStaleWebrtcSlot && 'border-red-500/40 bg-red-500/8 text-red-300',
                )}
              >
                <SelectItem value="">-- Participant --</SelectItem>
                {participants.map(p => (
                  <SelectItem key={p} value={p} disabled={usedValues.includes(p)}>{p}</SelectItem>
                ))}
                {connectedVirtualSources.length > 0 && participants.length > 0 && (
                  <SelectItem value="__sep__" disabled>── Duplicates ──</SelectItem>
                )}
                {connectedVirtualSources.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={usedValues.includes(v.id)}>
                    ◎ {v.name}
                  </SelectItem>
                ))}
              </Select>
              {isStaleWebrtcSlot && (
                <span
                  id={`${slotId}-stale-warning`}
                  title={`"${slot.sourceValue}" left the meeting - rejoin or clear this slot`}
                  className="shrink-0 flex items-center text-red-400"
                >
                  <AlertTriangle size={11} />
                </span>
              )}
            </div>
          )}
          {slot.sourceType === 'rtmp' && (
            <Select
              value={slot.sourceValue}
              onValueChange={handleValueChange}
              className="w-full"
            >
              <SelectItem value="">-- Stream --</SelectItem>
              {rtmpSources.map(s => {
                const isOffline = s.status !== 'online' && s.status !== 'live'
                return (
                  <SelectItem key={String(s.id)} value={s.name} disabled={usedValues.includes(s.name) || isOffline}>
                    {isOffline ? `${s.name} (offline)` : s.name}
                  </SelectItem>
                )
              })}
            </Select>
          )}
          {slot.sourceType === 'vod' && (
            <div className="flex items-center gap-1 w-full">
            <div id={`${slotId}-vod-dropdown`} ref={vodRef} className="relative flex-1">
              <button
                id={`${slotId}-vod-trigger`}
                ref={vodTriggerRef}
                type="button"
                onClick={() => {
                  if (!vodOpen && vodTriggerRef.current) {
                    const rect = vodTriggerRef.current.getBoundingClientRect()
                    const dropdownMaxHeight = 196
                    const spaceBelow = window.innerHeight - rect.bottom - 4
                    const top = spaceBelow >= dropdownMaxHeight
                      ? rect.bottom + 4
                      : Math.max(8, rect.top - 4 - dropdownMaxHeight)
                    const dropdownWidth = Math.max(rect.width, 176)
                    const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 8))
                    setVodPos({ top, left, width: rect.width })
                  }
                  setVodOpen(o => !o)
                  setVodSearch('')
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-base min-h-10',
                  'bg-white/4 border border-white/8 rounded-lg text-white/80 cursor-pointer transition-colors',
                  vodOpen && 'border-[#3031cb]/40',
                )}
              >
                <span className="truncate">{slot.sourceValue || '-- Video --'}</span>
                <ChevronDown size={14} className="shrink-0 text-white/40" />
              </button>
              {vodOpen && (
                <div
                  className="fixed z-9999 min-w-44 bg-secondary-bg border border-white/10 rounded-lg shadow-xl"
                  style={{ top: vodPos.top, left: vodPos.left, width: vodPos.width }}
                >
                  {showVodSearch && (
                    <div className="p-1.5 border-b border-white/8">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                        <Search size={12} className="shrink-0 text-white/40" />
                        <input
                           id={`${slotId}-vod-search`}
                           autoFocus
                           value={vodSearch}
                           onChange={e => setVodSearch(e.target.value)}
                           placeholder="Search..."
                           className="flex-1 bg-transparent text-base text-white/80 placeholder-white/30 outline-hidden"
                         />
                      </div>
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto p-1">
                    {isLoadingVideoAssets
                      ? <p className="px-2 py-3 text-[10px] text-white/30 text-center">Loading...</p>
                      : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVodValueChange('')}
                            className="w-full text-left px-3 py-2 text-base rounded-md cursor-pointer flex items-center justify-between text-white/40 hover:bg-white/8 hover:text-white/70"
                          >
                            <span>-- Video --</span>
                            {!slot.sourceValue && <Check size={14} className="text-[#3031cb]" />}
                          </button>
                          {filteredVodAssets.map(v => (
                            <button
                              key={v.name}
                              type="button"
                              disabled={usedValues.includes(v.name)}
                              onClick={() => handleVodValueChange(v.name)}
                              className={cn(
                                'w-full text-left px-3 py-2 text-base rounded-md flex items-center justify-between',
                                usedValues.includes(v.name)
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'text-white/70 hover:bg-white/8 hover:text-white cursor-pointer',
                              )}
                            >
                              <span className="truncate">{v.name}</span>
                              {slot.sourceValue === v.name && <Check size={14} className="shrink-0 text-[#3031cb]" />}
                            </button>
                          ))}
                          {filteredVodAssets.length === 0 && (
                            <p className="px-2 py-1 text-base text-white/30 text-center">No results</p>
                          )}
                        </>
                      )
                    }
                  </div>
                </div>
              )}
            </div>
            <button
              id={`${slotId}-btn-preview-vod`}
              type="button"
              disabled={!slot.sourceValue}
              onClick={() => {
                const asset = videoAssets.find(v => v.name === slot.sourceValue)
                const url = asset?.previewurl || getVideoBase() + encodeURIComponent(slot.sourceValue)
                openVideoPopup(slot.sourceValue, url)
              }}
              title="Preview video"
              className={cn(
                'shrink-0 w-6 h-5 flex items-center justify-center rounded border cursor-pointer transition-colors',
                slot.sourceValue
                  ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-950/60'
                  : 'border-white/8 bg-white/3 text-white/25 cursor-not-allowed',
              )}
            >
              <MonitorPlay size={9} />
            </button>
            </div>
          )}
          {!slot.sourceType && (
            <div className="py-0.5 px-1 text-[10px] bg-white/3 border border-white/6 rounded text-white/20 italic">
              Select type first
            </div>
          )}
        </div>

        {/* Controls popover (volume + transform) */}
        <div id={`${slotId}-controls-wrap`} ref={controlsRef} className="relative shrink-0">
          <button
            id={`${slotId}-btn-controls`}
            ref={controlsBtnRef}
            type="button"
            disabled={!slot.sourceValue}
            onClick={() => {
              if (!controlsOpen && controlsBtnRef.current) {
                const rect = controlsBtnRef.current.getBoundingClientRect()
                const panelEstimatedHeight = 200
                const panelWidth = 208
                setControlsPos({
                  top: Math.max(panelEstimatedHeight + 8, rect.top - 8),
                  left: Math.min(Math.max(panelWidth + 8, rect.right), window.innerWidth - 8),
                })
              }
              setControlsOpen(o => !o)
            }}
            title={isVirtualSlot ? 'Transform' : showTransformControls ? 'Volume & transform' : 'Volume'}
            className={cn(
              'w-6 h-5 flex items-center justify-center rounded border cursor-pointer transition-colors',
              controlsOpen
                ? 'border-[#3031cb]/40 bg-[#3031cb]/10 text-[#3031cb]'
                : 'border-white/8 bg-white/3 text-white/50 hover:text-white/80',
              !slot.sourceValue && 'opacity-30 cursor-not-allowed',
            )}
          >
            <SlidersHorizontal size={9} />
          </button>
          {controlsOpen && (
            <div
              id={`${slotId}-controls-panel`}
              style={{ top: controlsPos.top, left: controlsPos.left, transform: 'translate(-100%, -100%)' }}
              className="fixed z-9999 w-52 bg-secondary-bg border border-white/10 rounded-lg shadow-xl p-2.5 flex flex-col gap-2"
            >
              {isActive && (
                <div id={`${slotId}-controls-live-badge`} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3031cb] animate-pulse" />
                  <span className="text-[9px] text-[#3031cb] font-medium">Live preview</span>
                </div>
              )}
              {/* Volume — hidden for dup slots (audio owned by the real source) */}
              {!isVirtualSlot && (
                <div id={`${slotId}-controls-volume`} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/50">Volume</span>
                    <span className="text-[9px] text-white/70 font-mono">{slot.volume}</span>
                  </div>
                  <input
                    id={`${slotId}-range-volume`}
                    type="range"
                    min={0}
                    max={100}
                    value={slot.volume}
                    onChange={e => onVolumeChange(Number(e.target.value))}
                    className="w-full h-1 accent-[#3031cb] cursor-pointer"
                  />
                </div>
              )}
              {/* Transform - webrtc only */}
              {showTransformControls && (
                <>
                  <div id={`${slotId}-controls-panx`} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/50">Pan X</span>
                      <span className="text-[9px] text-white/70 font-mono">{slot.panX} px</span>
                    </div>
                    <input
                      id={`${slotId}-range-panx`}
                      type="range"
                      min={-300}
                      max={300}
                      value={slot.panX}
                      onChange={e => onTransformChange({ panX: Number(e.target.value) })}
                      className="w-full h-1 accent-[#3031cb] cursor-pointer"
                    />
                  </div>
                  <div id={`${slotId}-controls-pany`} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/50">Pan Y</span>
                      <span className="text-[9px] text-white/70 font-mono">{slot.panY} px</span>
                    </div>
                    <input
                      id={`${slotId}-range-pany`}
                      type="range"
                      min={-300}
                      max={300}
                      value={slot.panY}
                      onChange={e => onTransformChange({ panY: Number(e.target.value) })}
                      className="w-full h-1 accent-[#3031cb] cursor-pointer"
                    />
                  </div>
                  <div id={`${slotId}-controls-zoom`} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/50">Zoom</span>
                      <span className="text-[9px] text-white/70 font-mono">{slot.zoom.toFixed(2)}</span>
                    </div>
                    <input
                      id={`${slotId}-range-zoom`}
                      type="range"
                      min={1}
                      max={2}
                      step={0.01}
                      value={slot.zoom}
                      onChange={e => onTransformChange({ zoom: Number(e.target.value) })}
                      className="w-full h-1 accent-[#3031cb] cursor-pointer"
                    />
                  </div>
                </>
              )}
              {/* Reset */}
              {(() => {
                const isAtDefaults = (isVirtualSlot || slot.volume === 100) && (!showTransformControls || (slot.panX === 0 && slot.panY === 0 && slot.zoom === 1))
                return (
                  <button
                    id={`${slotId}-btn-reset-controls`}
                    type="button"
                    disabled={isAtDefaults}
                    onClick={() => {
                      if (!isVirtualSlot) onVolumeChange(100)
                      if (showTransformControls) onTransformChange({ panX: 0, panY: 0, zoom: 1 })
                    }}
                    title="Reset to defaults"
                    className={cn(
                      'w-full flex items-center justify-center gap-1 py-1 rounded border text-[9px] font-medium transition-colors',
                      isAtDefaults
                        ? 'border-white/6 bg-white/2 text-white/20 cursor-not-allowed'
                        : 'border-white/12 bg-white/5 text-white/55 hover:border-[#3031cb]/30 hover:bg-[#3031cb]/8 hover:text-[#3031cb] cursor-pointer',
                    )}
                  >
                    <RotateCcw size={9} /> Reset to defaults
                  </button>
                )
              })()}
            </div>
          )}
        </div>

        {/* Mute toggle — hidden for dup slots and webrtc (webrtc mute controlled from sidebar) */}
        {!isVirtualSlot && slot.sourceType !== 'webrtc' && (
          <button
            id={`${slotId}-btn-mute`}
            type="button"
            disabled={!slot.sourceValue}
            onClick={() => onUpdate({ muted: !slot.muted })}
            className={cn(
              'shrink-0 w-6 h-5 flex items-center justify-center rounded border cursor-pointer transition-colors',
              slot.muted
                ? 'border-[#3031cb]/25 bg-[#3031cb]/8 text-[#3031cb]'
                : 'border-white/8 bg-white/3 text-white/50',
              !slot.sourceValue && 'opacity-30 cursor-not-allowed',
            )}
            title={slot.muted ? 'Unmute' : 'Mute'}
          >
            {slot.muted ? <VolumeX size={9} /> : <Volume2 size={9} />}
          </button>
        )}

        {/* Loop toggle - VOD only */}
        {slot.sourceType === 'vod' && (
          <button
            id={`${slotId}-btn-loop`}
            type="button"
            disabled={!slot.sourceValue}
            onClick={() => onUpdate({ loop: !slot.loop })}
            className={cn(
              'shrink-0 w-6 h-5 flex items-center justify-center rounded border cursor-pointer transition-colors',
              slot.loop
                ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'
                : 'border-white/8 bg-white/3 text-white/30',
              !slot.sourceValue && 'opacity-30 cursor-not-allowed',
            )}
            title={slot.loop ? 'Loop on' : 'Loop off'}
          >
            <Repeat size={9} />
          </button>
        )}

        {/* Remove slot */}
        <button
          id={`${slotId}-btn-remove`}
          type="button"
          onClick={() => setRemoveConfirmOpen(true)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded border border-white/8 bg-white/3 text-white/30 hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-400 cursor-pointer transition-colors"
          title="Remove source"
        >
          <X size={9} />
        </button>
        <ConfirmDialog
          open={removeConfirmOpen}
          onOpenChange={setRemoveConfirmOpen}
          title="Remove source"
          description={`Remove "${slot.sourceValue || 'this source'}" from this row?`}
          variant="danger"
          confirmLabel="Remove"
          onConfirm={onRemove}
        />
        <ConfirmDialog
          open={activeChangeConfirmOpen}
          onOpenChange={(open) => {
            setActiveChangeConfirmOpen(open)
            if (!open) setPendingPatch(null)
          }}
          title="Change live source"
          description="This slot is currently live. Changing it will mute the current source. Continue?"
          confirmLabel="Change"
          onConfirm={() => {
            if (!pendingPatch) return
            const targetType = ('sourceType' in pendingPatch ? pendingPatch.sourceType : slot.sourceType) as SourceType
            const targetValue = pendingPatch.sourceValue ?? slot.sourceValue
            if (targetValue) {
              if (targetType === 'webrtc' && !participants.includes(targetValue) && !connectedVirtualSources.some(v => v.id === targetValue)) {
                onShowToast('Source unavailable', `"${targetValue}" is no longer connected.`)
                setPendingPatch(null)
                return
              }
              if (targetType === 'rtmp' && !rtmpSources.some(s => s.name === targetValue)) {
                onShowToast('Source unavailable', `RTMP stream "${targetValue}" is no longer active.`)
                setPendingPatch(null)
                return
              }
            }
            if ('sourceType' in pendingPatch) {
              setVodOpen(false)
              setVodSearch('')
            }
            onUpdate(pendingPatch)
            setPendingPatch(null)
          }}
        />
    </div>
  )
}
