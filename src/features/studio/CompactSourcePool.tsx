import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Film, Layers, Play, Plus, Radio, Repeat, RotateCcw, SlidersHorizontal, Volume2, VolumeX, Wifi, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { getVideoBase } from '../../lib/studioConfig'
import type { ParticipantSource, RtmpSource, SourceSlot, SourceType, VideoAsset, VirtualSource } from '../../types/studio'

type PoolSlot = SourceSlot & { slotKey: string; displayName?: string }

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  webrtc: 'WebRTC',
  rtmp: 'RTMP',
  vod: 'VOD',
}

const SOURCE_TYPE_COLOR: Record<SourceType, string> = {
  webrtc: 'bg-sky-500/12 text-sky-400 border-sky-500/25',
  rtmp: 'bg-orange-500/12 text-orange-400 border-orange-500/25',
  vod: 'bg-violet-500/12 text-violet-400 border-violet-500/25',
}

function buildDisplayName(
  sourceType: SourceType,
  sourceValue: string,
  webrtcSources: ParticipantSource[],
  rtmpSources: RtmpSource[],
  virtualSources: VirtualSource[],
): string {
  if (sourceType === 'webrtc') {
    const virtualSource = virtualSources.find(v => v.id === sourceValue)
    if (virtualSource) return virtualSource.name
    return webrtcSources.find(s => s.name === sourceValue)?.name ?? sourceValue
  }
  if (sourceType === 'rtmp') return rtmpSources.find(s => s.name === sourceValue)?.name ?? sourceValue
  return sourceValue.split('/').pop() ?? sourceValue
}

// ── Pool Card Thumbnail ───────────────────────────────────────────────────────

interface PoolCardThumbnailProps {
  slot: PoolSlot
  previewUrl: string | null
  displayName: string
  videoAssets: VideoAsset[]
  onPlayVod: () => void
}

const THUMBNAIL_MAX_RETRIES = 2
const THUMBNAIL_RETRY_DELAY_MS = 1000

function PoolCardThumbnail({ slot, previewUrl, displayName, videoAssets, onPlayVod }: PoolCardThumbnailProps) {
  const [videoError, setVideoError] = useState(false)
  const [posterError, setPosterError] = useState(false)
  const [videoRetryCount, setVideoRetryCount] = useState(0)
  const [posterRetryCount, setPosterRetryCount] = useState(0)

  if (slot.sourceType === 'vod') {
    const asset = videoAssets.find(v => v.name === slot.sourceValue)
    const videoPreviewUrl = asset?.previewurl ?? ''
    const posterPath = asset?.misc?.posterPath ?? ''

    const showFallback = (!videoPreviewUrl || videoError) && (!posterPath || posterError)

    function handleVideoError() {
      if (videoRetryCount < THUMBNAIL_MAX_RETRIES) {
        setTimeout(() => setVideoRetryCount(c => c + 1), THUMBNAIL_RETRY_DELAY_MS)
      } else {
        setVideoError(true)
      }
    }

    function handlePosterError() {
      if (posterRetryCount < THUMBNAIL_MAX_RETRIES) {
        setTimeout(() => setPosterRetryCount(c => c + 1), THUMBNAIL_RETRY_DELAY_MS)
      } else {
        setPosterError(true)
      }
    }

    return (
      <>
        {videoPreviewUrl && !videoError ? (
          <video
            key={`video-${videoRetryCount}`}
            src={videoPreviewUrl}
            muted
            preload="none"
            poster={posterPath || undefined}
            onError={handleVideoError}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : posterPath && !posterError ? (
          <img
            key={`poster-${posterRetryCount}`}
            src={posterPath}
            alt={displayName}
            onError={handlePosterError}
            className="w-full h-full object-cover"
          />
        ) : showFallback ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-1.5 px-2">
            <Film size={20} />
            <span className="text-[9px] text-center line-clamp-2 leading-tight">{displayName}</span>
          </div>
        ) : null}
        {/* VOD play button */}
        <button
          id={`compact-pool-card-thumb-btn-play-${slot.slotKey}`}
          type="button"
          onClick={e => { e.stopPropagation(); onPlayVod() }}
          title="Preview video"
          className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 border border-white/35 text-white cursor-pointer transition-all hover:bg-[#3031cb]/80 hover:border-[#3031cb]/60"
        >
          <Play size={10} className="ml-0.5" />
        </button>
      </>
    )
  }

  if (previewUrl) {
    return (
      <iframe
        src={previewUrl}
        className="w-full h-full border-none pointer-events-none"
        loading="lazy"
        scrolling="no"
      />
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/25 gap-1">
      {slot.sourceType === 'rtmp' ? <Radio size={16} /> : <Wifi size={16} />}
      <span className="text-[8px] text-white/20">offline</span>
    </div>
  )
}

// ── Pool Card ─────────────────────────────────────────────────────────────────

interface PoolCardProps {
  slot: PoolSlot
  isSelected: boolean
  isDragging: boolean
  isReorderDropTarget: boolean
  isReplaceTarget: boolean
  isStale: boolean
  canRemove: boolean
  displayName: string
  previewUrl: string | null
  onToggleSelect: () => void
  onRemove: () => void
  onUpdate: (patch: Partial<SourceSlot>) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

function PoolCard({
  slot, isSelected, isDragging, isReorderDropTarget, isReplaceTarget, isStale, canRemove,
  displayName, previewUrl,
  onToggleSelect, onRemove, onUpdate,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: PoolCardProps) {
  const { videoAssets, openVideoPopup } = useStudioCtx()

  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const [controlsPos, setControlsPos] = useState({ top: 0, left: 0 })
  const controlsPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isControlsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (controlsPanelRef.current && !controlsPanelRef.current.contains(e.target as Node)) {
        setIsControlsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isControlsOpen])

  function handleControlsBtnClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (isControlsOpen) { setIsControlsOpen(false); return }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    setControlsPos({
      top: Math.min(rect.top, window.innerHeight - 196),
      left: rect.left,
    })
    setIsControlsOpen(true)
  }

  function handlePlayVod() {
    const asset = videoAssets.find(v => v.name === slot.sourceValue)
    const url = asset?.previewurl || getVideoBase() + encodeURIComponent(slot.sourceValue)
    openVideoPopup(slot.sourceValue, url)
  }

  const isAtDefaults = slot.volume === 100 && slot.panX === 0 && slot.panY === 0 && slot.zoom === 1

  return (
    <div
      id={`compact-pool-card-${slot.slotKey}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onToggleSelect}
      className={cn(
        'flex flex-col rounded-lg border-2 cursor-pointer transition-all overflow-hidden select-none',
        isDragging && 'opacity-30',
        isReplaceTarget && 'border-amber-400/60 bg-amber-400/5',
        isReorderDropTarget && !isReplaceTarget && 'ring-2 ring-[#3031cb]/60',
        !isReplaceTarget && !isReorderDropTarget && (
          isStale
            ? 'border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.18)] bg-red-500/4'
            : isSelected
              ? 'border-[#3031cb]/70 shadow-[0_0_10px_rgba(48,49,203,0.2)] bg-[#3031cb]/3'
              : 'border-white/8 hover:border-white/18 bg-white/2'
        ),
      )}
    >
      {/* Thumbnail */}
      <div
        id={`compact-pool-card-thumb-${slot.slotKey}`}
        className="relative w-full overflow-hidden rounded-t-md bg-[#040810]"
        style={{ aspectRatio: '16/9' }}
      >
        <PoolCardThumbnail
          slot={slot}
          previewUrl={previewUrl}
          displayName={displayName}
          videoAssets={videoAssets}
          onPlayVod={handlePlayVod}
        />

        {/* Source type badge */}
        <span
          id={`compact-pool-card-type-badge-${slot.slotKey}`}
          className={cn(
            'absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border leading-none',
            SOURCE_TYPE_COLOR[slot.sourceType as SourceType],
          )}
        >
          {SOURCE_TYPE_LABEL[slot.sourceType as SourceType]}
        </span>

        {/* Stale badge — the webrtc participant backing this slot has left the meeting */}
        {isStale && (
          <span
            id={`compact-pool-card-stale-badge-${slot.slotKey}`}
            title={`"${displayName}" left the meeting - remove or replace before firing`}
            className="absolute top-1 left-10 flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border leading-none bg-red-500/15 text-red-400 border-red-500/35"
          >
            <AlertTriangle size={9} />
            <span>Left</span>
          </span>
        )}

        {/* Remove button */}
        <button
          id={`compact-pool-card-btn-remove-${slot.slotKey}`}
          type="button"
          disabled={!canRemove}
          onClick={e => { e.stopPropagation(); onRemove() }}
          title={!canRemove ? (isSelected ? 'Deselect to remove' : 'Parent source is selected') : 'Remove from pool'}
          className={cn(
            'absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full border transition-colors',
            !canRemove
              ? 'bg-black/20 border-white/8 text-white/12 cursor-not-allowed'
              : 'bg-black/50 border-white/20 text-white/45 hover:bg-[#3031cb]/80 hover:border-[#3031cb] hover:text-white cursor-pointer',
          )}
        >
          <X size={9} />
        </button>

        {/* Selected overlay tint */}
        {isSelected && (
          <div
            id={`compact-pool-card-selected-overlay-${slot.slotKey}`}
            className="absolute inset-0 bg-[#3031cb]/8 pointer-events-none"
          />
        )}
      </div>

      {/* Source name */}
      <div id={`compact-pool-card-name-${slot.slotKey}`} className="px-2 pt-1.5 shrink-0">
        <span className="block text-[10px] text-white/70 truncate leading-tight" title={displayName}>
          {displayName}
        </span>
      </div>

      {/* Footer controls */}
      <div
        id={`compact-pool-card-footer-${slot.slotKey}`}
        className="flex items-center gap-1.5 px-2 py-1.5 mt-auto border-t border-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Mute toggle — hidden for webrtc (webrtc mute controlled from sidebar) */}
        {slot.sourceType !== 'webrtc' && (
          <button
            id={`compact-pool-card-btn-mute-${slot.slotKey}`}
            type="button"
            onClick={() => onUpdate({ muted: !slot.muted })}
            title={slot.muted ? 'Unmute' : 'Mute'}
            className={cn(
              'shrink-0 w-7 h-7 flex items-center justify-center rounded border cursor-pointer transition-colors',
              slot.muted
                ? 'border-[#3031cb]/25 bg-[#3031cb]/8 text-[#3031cb]'
                : 'border-white/8 bg-white/3 text-white/35 hover:text-white/60',
            )}
          >
            {slot.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}

        {/* Loop toggle - VOD only */}
        {slot.sourceType === 'vod' && (
          <button
            id={`compact-pool-card-btn-loop-${slot.slotKey}`}
            type="button"
            onClick={() => onUpdate({ loop: !slot.loop })}
            title={slot.loop ? 'Loop on' : 'Loop off'}
            className={cn(
              'shrink-0 w-7 h-7 flex items-center justify-center rounded border cursor-pointer transition-colors',
              slot.loop
                ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'
                : 'border-white/8 bg-white/3 text-white/25 hover:text-white/50',
            )}
          >
            <Repeat size={12} />
          </button>
        )}

        {/* Controls button */}
        <button
          id={`compact-pool-card-btn-controls-${slot.slotKey}`}
          type="button"
          onClick={handleControlsBtnClick}
          title="Volume and transform"
          className={cn(
            'shrink-0 w-7 h-7 flex items-center justify-center rounded border cursor-pointer transition-colors',
            isControlsOpen
              ? 'border-[#3031cb]/40 bg-[#3031cb]/10 text-[#3031cb]'
              : 'border-white/8 bg-white/3 text-white/35 hover:text-white/60',
          )}
        >
          <SlidersHorizontal size={12} />
        </button>
      </div>

      {/* Controls popover - fixed overlay */}
      {isControlsOpen && (
        <div
          id={`compact-pool-card-controls-panel-${slot.slotKey}`}
          ref={controlsPanelRef}
          className="fixed z-9999 w-48 bg-secondary-bg border border-white/10 rounded-lg shadow-xl p-2 flex flex-col gap-1.5"
          style={{ top: controlsPos.top, left: controlsPos.left, transform: 'translate(-100%, -8px)' }}
        >
          {/* Volume */}
          <div id={`compact-pool-card-controls-volume-${slot.slotKey}`} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/50">Volume</span>
              <span className="text-[9px] text-white/70 font-mono">{slot.volume}</span>
            </div>
            <input
              id={`compact-pool-card-controls-range-volume-${slot.slotKey}`}
              type="range" min={0} max={100} value={slot.volume}
              onChange={e => onUpdate({ volume: Number(e.target.value) })}
              className="w-full h-1 accent-[#3031cb] cursor-pointer"
            />
          </div>
          {/* Pan X */}
          <div id={`compact-pool-card-controls-panx-${slot.slotKey}`} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/50">Pan X</span>
              <span className="text-[9px] text-white/70 font-mono">{slot.panX} px</span>
            </div>
            <input
              id={`compact-pool-card-controls-range-panx-${slot.slotKey}`}
              type="range" min={-300} max={300} value={slot.panX}
              onChange={e => onUpdate({ panX: Number(e.target.value) })}
              className="w-full h-1 accent-[#3031cb] cursor-pointer"
            />
          </div>
          {/* Pan Y */}
          <div id={`compact-pool-card-controls-pany-${slot.slotKey}`} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/50">Pan Y</span>
              <span className="text-[9px] text-white/70 font-mono">{slot.panY} px</span>
            </div>
            <input
              id={`compact-pool-card-controls-range-pany-${slot.slotKey}`}
              type="range" min={-300} max={300} value={slot.panY}
              onChange={e => onUpdate({ panY: Number(e.target.value) })}
              className="w-full h-1 accent-[#3031cb] cursor-pointer"
            />
          </div>
          {/* Zoom */}
          <div id={`compact-pool-card-controls-zoom-${slot.slotKey}`} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/50">Zoom</span>
              <span className="text-[9px] text-white/70 font-mono">{slot.zoom.toFixed(2)}</span>
            </div>
            <input
              id={`compact-pool-card-controls-range-zoom-${slot.slotKey}`}
              type="range" min={1} max={2} step={0.01} value={slot.zoom}
              onChange={e => onUpdate({ zoom: Number(e.target.value) })}
              className="w-full h-1 accent-[#3031cb] cursor-pointer"
            />
          </div>
          {/* Reset */}
          <button
            id={`compact-pool-card-controls-btn-reset-${slot.slotKey}`}
            type="button"
            disabled={isAtDefaults}
            onClick={() => onUpdate({ volume: 100, panX: 0, panY: 0, zoom: 1 })}
            title="Reset to defaults"
            className={cn(
              'w-full flex items-center justify-center gap-1 py-1 rounded border text-[9px] font-medium transition-colors',
              isAtDefaults
                ? 'border-white/6 bg-white/2 text-white/20 cursor-not-allowed'
                : 'border-white/12 bg-white/5 text-white/55 hover:border-[#3031cb]/30 hover:bg-[#3031cb]/8 hover:text-[#3031cb] cursor-pointer',
            )}
          >
            <RotateCcw size={9} />
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add Source Card ───────────────────────────────────────────────────────────

interface AddSourceCardProps {
  sourcePool: PoolSlot[]
  onAdd: (sourceType: SourceType, sourceValue: string, isScreenShare: boolean, displayName: string) => void
}

function AddSourceCard({ sourcePool, onAdd }: AddSourceCardProps) {
  const { webrtcSources, rtmpSources, virtualSources, videoAssets } = useStudioCtx()

  const [isOpen, setIsOpen] = useState(false)
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType>('webrtc')
  const [selectedSourceValue, setSelectedSourceValue] = useState('')

  const sourceOptions = useMemo(() => {
    const alreadyInPool = new Set(
      sourcePool.filter(s => s.sourceType === selectedSourceType).map(s => s.sourceValue),
    )
    if (selectedSourceType === 'webrtc') {
      const realSources = webrtcSources
        .filter(s => !alreadyInPool.has(s.name))
        .map(s => ({ value: s.name, label: s.name, isScreenShare: s.isScreenShare ?? false, disabled: false }))
      const virtualSrcs = virtualSources
        .filter(v => !alreadyInPool.has(v.id))
        .map(v => ({ value: v.id, label: v.name, isScreenShare: false, disabled: false }))
      return [...realSources, ...virtualSrcs]
    }
    if (selectedSourceType === 'rtmp') {
      return rtmpSources
        .filter(s => !alreadyInPool.has(s.name))
        .map(s => {
          const isOffline = s.status !== 'online' && s.status !== 'live'
          return { value: s.name, label: isOffline ? `${s.name} (offline)` : s.name, isScreenShare: false, disabled: isOffline }
        })
    }
    return videoAssets
      .filter(a => !alreadyInPool.has(a.name))
      .map(a => ({ value: a.name, label: a.name.split('/').pop() ?? a.name, isScreenShare: false, disabled: false }))
  }, [selectedSourceType, webrtcSources, rtmpSources, virtualSources, videoAssets, sourcePool])

  function handleConfirm() {
    if (!selectedSourceValue) return
    const opt = sourceOptions.find(o => o.value === selectedSourceValue)
    if (!opt) return
    const displayName = buildDisplayName(selectedSourceType, selectedSourceValue, webrtcSources, rtmpSources, virtualSources)
    onAdd(selectedSourceType, selectedSourceValue, opt.isScreenShare, displayName)
    setIsOpen(false)
    setSelectedSourceType('webrtc')
    setSelectedSourceValue('')
  }

  function handleCancel() {
    setIsOpen(false)
    setSelectedSourceValue('')
  }

  if (!isOpen) {
    return (
      <button
        id="compact-pool-add-card-btn"
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/10 hover:border-[#3031cb]/30 cursor-pointer transition-colors text-white/25 hover:text-white/45 min-h-16"
        style={{ aspectRatio: '16/9' }}
      >
        <Plus size={16} />
        <span className="text-[9px]">Add Source</span>
      </button>
    )
  }

  return (
    <div id="compact-pool-add-card" className="flex flex-col rounded-lg border-2 border-[#3031cb]/30 bg-[#3031cb]/4 overflow-hidden p-2 gap-1.5">
      <select
        id="compact-pool-add-card-select-type"
        value={selectedSourceType}
        onChange={e => { setSelectedSourceType(e.target.value as SourceType); setSelectedSourceValue('') }}
        className="w-full text-[10px] bg-primary-bg border border-white/10 rounded px-1.5 py-1 text-white/80 cursor-pointer outline-hidden"
      >
        <option value="webrtc">WebRTC</option>
        <option value="rtmp">RTMP</option>
        <option value="vod">VOD</option>
      </select>

      <select
        id="compact-pool-add-card-select-value"
        value={selectedSourceValue}
        onChange={e => setSelectedSourceValue(e.target.value)}
        disabled={sourceOptions.length === 0}
        className="w-full text-[10px] bg-primary-bg border border-white/10 rounded px-1.5 py-1 text-white/80 cursor-pointer outline-hidden disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <option value="">
          {sourceOptions.length === 0 ? 'No sources available' : 'Select source…'}
        </option>
        {sourceOptions.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        ))}
      </select>

      <div id="compact-pool-add-card-actions" className="flex gap-1">
        <button
          id="compact-pool-add-card-btn-confirm"
          type="button"
          disabled={!selectedSourceValue}
          onClick={handleConfirm}
          className="flex-1 py-1 text-[9px] font-medium rounded bg-[#3031cb]/80 hover:bg-[#3031cb] text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
        <button
          id="compact-pool-add-card-btn-cancel"
          type="button"
          onClick={handleCancel}
          className="flex-1 py-1 text-[9px] rounded border border-white/10 bg-white/4 text-white/50 hover:text-white/80 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Compact Source Pool ───────────────────────────────────────────────────────

interface CompactSourcePoolProps {
  sourcePool: PoolSlot[]
  selectedSlotKeys: Set<string>
  onToggleSelect: (slotKey: string) => void
  onRemove: (slotKey: string) => void
  onReorder: (fromIdx: number, toIdx: number) => void
  onAdd: (sourceType: SourceType, sourceValue: string, isScreenShare: boolean, displayName: string) => void
  onReplace: (slotKey: string, sourceType: SourceType, sourceValue: string, isScreenShare: boolean, displayName: string) => void
  onUpdate: (slotKey: string, patch: Partial<SourceSlot>) => void
}

export function CompactSourcePool({
  sourcePool, selectedSlotKeys, onToggleSelect, onRemove, onReorder, onAdd, onReplace, onUpdate,
}: CompactSourcePoolProps) {
  const { webrtcSources, rtmpSources, virtualSources, participants, buildStreamPreviewUrl } = useStudioCtx()

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null)
  const [reorderOverIdx, setReorderOverIdx] = useState<number | null>(null)
  const [replaceOverIdx, setReplaceOverIdx] = useState<number | null>(null)

  const REORDER_TYPE = 'x-compact-pool-reorder'

  function isReorderDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.includes(REORDER_TYPE)
  }

  function isSidebarDrag(e: React.DragEvent): boolean {
    return (
      e.dataTransfer.types.includes('text/plain') &&
      !e.dataTransfer.types.some(t => t.startsWith('x-'))
    )
  }

  function getSlotDisplayName(slot: PoolSlot): string {
    if (slot.sourceType === 'webrtc') {
      const virtualSource = virtualSources.find(v => v.id === slot.sourceValue)
      if (virtualSource) return virtualSource.name
      const webrtcSource = webrtcSources.find(s => s.name === slot.sourceValue)
      if (webrtcSource) return webrtcSource.name
      return slot.displayName ?? slot.sourceValue
    }
    if (slot.sourceType === 'rtmp') {
      return rtmpSources.find(s => s.name === slot.sourceValue)?.name ?? slot.sourceValue
    }
    return slot.sourceValue.split('/').pop() ?? slot.sourceValue
  }

  function getSlotPreviewUrl(slot: PoolSlot): string | null {
    if (slot.sourceType === 'webrtc') {
      const virtualSource = virtualSources.find(v => v.id === slot.sourceValue)
      if (virtualSource) {
        const parentSource = webrtcSources.find(s => s.name === virtualSource.sourceUserId)
        return parentSource ? buildStreamPreviewUrl(parentSource) : null
      }
      const source = webrtcSources.find(s => s.name === slot.sourceValue)
      return source ? buildStreamPreviewUrl(source) : null
    }
    if (slot.sourceType === 'rtmp') {
      const source = rtmpSources.find(s => s.name === slot.sourceValue)
      return source ? buildStreamPreviewUrl(source) : null
    }
    return null
  }

  function getSidebarDropSourceType(e: React.DragEvent): SourceType {
    const dtype = e.dataTransfer.getData('dtype')
    return dtype === 'video' ? 'vod' : ((e.dataTransfer.getData('sourceType') as SourceType) || 'webrtc')
  }

  function handleContainerDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    if (isReorderDrag(e)) return
    const sourceValue = e.dataTransfer.getData('text/plain')
    if (!sourceValue) return
    const sourceType = getSidebarDropSourceType(e)
    const isScreenShare = e.dataTransfer.getData('isScreenShare') === '1'
    onAdd(sourceType, sourceValue, isScreenShare, buildDisplayName(sourceType, sourceValue, webrtcSources, rtmpSources, virtualSources))
  }

  function handleReorder(dropIdx: number) {
    if (reorderDragIdx === null || reorderDragIdx === dropIdx) return
    onReorder(reorderDragIdx, dropIdx)
    setReorderDragIdx(null)
    setReorderOverIdx(null)
  }

  return (
    <div
      id="compact-source-pool"
      className={cn(
        'flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg transition-colors',
        isDraggingOver && 'outline outline-[#3031cb]/40 bg-[#3031cb]/3',
      )}
      onDragOver={e => { e.preventDefault(); if (isSidebarDrag(e)) setIsDraggingOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false) }}
      onDrop={handleContainerDrop}
    >
      {sourcePool.length === 0 ? (
        /* Empty state */
        <div id="compact-source-pool-empty" className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
          <div
            id="compact-source-pool-empty-icon"
            className="w-12 h-12 rounded-full bg-white/4 border border-white/8 flex items-center justify-center"
          >
            <Layers size={20} className="text-white/20" />
          </div>
          <div id="compact-source-pool-empty-text" className="flex flex-col gap-1">
            <span className="text-[11px] text-white/45 font-medium">No sources in pool</span>
            <span className="text-[9px] text-white/25 leading-relaxed">
              Drag from the sidebar or use Add Source<br />to build your source pool.
            </span>
          </div>
          <div id="compact-source-pool-empty-add" className="w-full max-w-36">
            <AddSourceCard sourcePool={sourcePool} onAdd={onAdd} />
          </div>
        </div>
      ) : (
        /* Card grid */
        <div id="compact-source-pool-grid-scroll" className="flex-1 min-h-0 overflow-y-auto">
        <div
          id="compact-source-pool-grid"
          className="p-2 grid gap-2 content-start"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        >
          {sourcePool.map((slot, slotIdx) => {
            const isSelected = selectedSlotKeys.has(slot.slotKey)
            const isDraggingThisSlot = reorderDragIdx === slotIdx
            const isReorderDropTarget = reorderOverIdx === slotIdx && reorderDragIdx !== slotIdx
            const isReplaceTarget = replaceOverIdx === slotIdx && reorderDragIdx === null

            const parentParticipantId = slot.sourceType === 'webrtc'
              ? (virtualSources.find(v => v.id === slot.sourceValue)?.sourceUserId ?? null)
              : null
            const isParentSelected = parentParticipantId !== null && sourcePool.some(
              s => selectedSlotKeys.has(s.slotKey) && s.sourceType === 'webrtc' && s.sourceValue === parentParticipantId,
            )
            const canRemove = !isSelected && !isParentSelected
            const isStale =
              slot.sourceType === 'webrtc' &&
              !!slot.sourceValue &&
              !participants.includes(slot.sourceValue) &&
              !virtualSources.some(v => v.id === slot.sourceValue)

            return (
              <PoolCard
                key={slot.slotKey}
                slot={slot}
                isSelected={isSelected}
                isDragging={isDraggingThisSlot}
                isReorderDropTarget={isReorderDropTarget}
                isReplaceTarget={isReplaceTarget}
                isStale={isStale}
                canRemove={canRemove}
                displayName={getSlotDisplayName(slot)}
                previewUrl={getSlotPreviewUrl(slot)}
                onToggleSelect={() => onToggleSelect(slot.slotKey)}
                onRemove={() => onRemove(slot.slotKey)}
                onUpdate={patch => onUpdate(slot.slotKey, patch)}
                onDragStart={e => {
                  setReorderDragIdx(slotIdx)
                  e.dataTransfer.setData(REORDER_TYPE, String(slotIdx))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null) }}
                onDragOver={e => {
                  if (isReorderDrag(e)) {
                    e.preventDefault(); e.stopPropagation()
                    setReorderOverIdx(slotIdx)
                  } else if (isSidebarDrag(e)) {
                    e.preventDefault(); e.stopPropagation()
                    setReplaceOverIdx(slotIdx)
                  }
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setReorderOverIdx(null)
                    setReplaceOverIdx(null)
                  }
                }}
                onDrop={e => {
                  if (isReorderDrag(e)) {
                    e.preventDefault(); e.stopPropagation()
                    handleReorder(slotIdx)
                  } else if (isSidebarDrag(e)) {
                    e.preventDefault(); e.stopPropagation()
                    setReplaceOverIdx(null)
                    const sourceValue = e.dataTransfer.getData('text/plain')
                    if (!sourceValue) return
                    const sourceType = getSidebarDropSourceType(e)
                    const isScreenShare = e.dataTransfer.getData('isScreenShare') === '1'
                    onReplace(slot.slotKey, sourceType, sourceValue, isScreenShare, buildDisplayName(sourceType, sourceValue, webrtcSources, rtmpSources, virtualSources))
                  }
                }}
              />
            )
          })}

          {/* Add Source card - always at end of grid */}
          <AddSourceCard sourcePool={sourcePool} onAdd={onAdd} />
        </div>
        </div>
      )}
    </div>
  )
}
