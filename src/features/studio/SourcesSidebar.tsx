import { useMemo, useState } from 'react'
import { Wifi, Radio, Film, RefreshCw, Play, Search, X, MapPin, Plus, Eye, EyeOff, Trash2, GripVertical, Mic, MicOff, Monitor, Copy, Crop, Pencil, Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { getVideoBase, RTMP_PUBLISH_URL_PREFIX } from '../../lib/studioConfig'
import type { AnySource, ParticipantSource, VideoAsset, SourceLocation, VirtualSource, CropRegion } from '../../types/studio'

// ── Locations Dialog ──────────────────────────────────────────────────────────

interface LocationsDialogProps {
  sourceName: string
  locations: SourceLocation[]
  onLocationsChange: (locations: SourceLocation[]) => void
  onClose: () => void
}

function LocationsDialog({ sourceName, locations, onLocationsChange, onClose }: LocationsDialogProps) {
  const [newLocationInput, setNewLocationInput] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropOverIndex, setDropOverIndex] = useState<number | null>(null)

  function handleAddLocation() {
    const label = newLocationInput.trim()
    if (!label || locations.some(l => l.label === label)) return
    onLocationsChange([...locations, { label, enabled: true }])
    setNewLocationInput('')
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddLocation() }
    if (e.key === 'Escape') onClose()
  }

  function handleToggleLocation(index: number) {
    onLocationsChange(locations.map((l, i) => i === index ? { ...l, enabled: !l.enabled } : l))
  }

  function handleDeleteLocation(index: number) {
    onLocationsChange(locations.filter((_, i) => i !== index))
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) setDropOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...locations]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    onLocationsChange(reordered)
    setDragIndex(null)
    setDropOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDropOverIndex(null)
  }

  return (
    <div
      id="studio-locations-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        id="studio-locations-dialog"
        className="w-72 rounded-xl border border-white/12 bg-[#0d1520] shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div id="studio-locations-dialog-header" className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
          <MapPin size={13} className="text-[#3031cb] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white">Locations</div>
            <div className="text-[9px] text-white/45 truncate">{sourceName}</div>
          </div>
          <button
            id="studio-locations-dialog-btn-close"
            type="button"
            onClick={onClose}
            className="text-white/35 hover:text-white/70 cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Location list */}
        <div id="studio-locations-dialog-list" className="flex flex-col gap-0.5 p-2 max-h-56 overflow-y-auto">
          {locations.length === 0 ? (
            <div className="text-center text-[10px] text-white/35 py-4">No locations added yet.</div>
          ) : (
            locations.map((location, locationIndex) => (
              <div
                key={location.label}
                id={`studio-locations-dialog-item-${locationIndex}`}
                draggable
                onDragStart={() => handleDragStart(locationIndex)}
                onDragOver={e => handleDragOver(e, locationIndex)}
                onDrop={() => handleDrop(locationIndex)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3 transition-colors group',
                  dragIndex === locationIndex ? 'opacity-40' : 'hover:bg-white/5',
                  dropOverIndex === locationIndex && dragIndex !== locationIndex ? 'border-t-2 border-[#3031cb]' : 'border-t-2 border-transparent',
                )}
              >
                <GripVertical size={12} className="text-white/20 cursor-grab active:cursor-grabbing shrink-0" />
                <span className={cn('flex-1 text-[11px] truncate', location.enabled ? 'text-white/80' : 'text-white/30 line-through')}>
                  {location.label}
                </span>
                <button
                  id={`studio-locations-dialog-btn-toggle-${locationIndex}`}
                  type="button"
                  onClick={() => handleToggleLocation(locationIndex)}
                  className={cn('cursor-pointer transition-colors', location.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/25 hover:text-white/50')}
                  title={location.enabled ? 'Disable location' : 'Enable location'}
                >
                  {location.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  id={`studio-locations-dialog-btn-delete-${locationIndex}`}
                  type="button"
                  onClick={() => handleDeleteLocation(locationIndex)}
                  className="text-white/20 hover:text-[#3031cb] cursor-pointer transition-colors"
                  title={`Delete ${location.label}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new location */}
        <div id="studio-locations-dialog-add-row" className="flex items-center gap-1.5 px-2 pb-2 pt-1 border-t border-white/6">
          <input
            id="studio-locations-dialog-input-new-location"
            type="text"
            value={newLocationInput}
            onChange={e => setNewLocationInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="New location…"
            className="flex-1 text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/25 outline-hidden focus:border-white/25 transition-colors"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button
            id="studio-locations-dialog-btn-add"
            type="button"
            onClick={handleAddLocation}
            disabled={!newLocationInput.trim()}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-[#3031cb]/20 hover:border-[#3031cb]/30 hover:text-[#3031cb] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Add location"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Source Tile ───────────────────────────────────────────────────────────────

interface SourceTileProps {
  src: AnySource
  previewUrl: string | null
  locations: SourceLocation[]
  onLocationsChange: (locations: SourceLocation[]) => void
  isMuted: boolean
  onMuteToggle: () => void
  onAddDuplicate?: () => void
}

function SourceTile({ src, previewUrl, locations, onLocationsChange, isMuted, onMuteToggle, onAddDuplicate }: SourceTileProps) {
  const isScreenShare = (src as ParticipantSource).isScreenShare ?? false
  const isLive = src.status === 'online' || src.status === 'live'
  const isDragDisabled = src.protocol === 'RTMP' && !isLive
  const borderCls = isLive
    ? 'border-[#3031cb]/50 shadow-[0_0_6px_rgba(48,49,203,0.15)]'
    : 'border-white/8 opacity-60'
  const publishTime = (src as ParticipantSource).publishTime
  const liveSince = publishTime
    ? new Date(publishTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false)
  const enabledLocationCount = locations.filter(l => l.enabled).length

  return (
    <>
      <div
        id={`studio-source-tile-${src.name}`}
        className={cn('rounded-lg border-2 bg-white/2 transition-all', borderCls)}
        draggable={false}
      >
        <div className="w-full aspect-video bg-[#040810] relative overflow-hidden rounded-t-md">
          {previewUrl ? (
            <iframe src={previewUrl} className="w-full h-full border-none pointer-events-auto" loading="lazy" scrolling="no" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/45 text-[10px] gap-1">
              {isScreenShare ? <Monitor size={14} /> : <Radio size={14} />}
              <span>{src.status}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'px-1.5 py-1 flex items-center justify-between gap-1',
            isDragDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          )}
          draggable={!isDragDisabled}
          title={isDragDisabled ? `RTMP stream "${src.name}" is offline` : undefined}
          onDragStart={e => {
            e.dataTransfer.setData('text/plain', src.name)
            e.dataTransfer.setData('dtype', 'participant')
            e.dataTransfer.setData('sourceType', src.protocol === 'WebRTC' ? 'webrtc' : 'rtmp')
            e.dataTransfer.setData('isScreenShare', isScreenShare ? '1' : '0')
            e.dataTransfer.effectAllowed = 'copy'
          }}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0">
              {isScreenShare && <Monitor size={10} className="text-sky-400 shrink-0" />}
              <span className="text-[10px] text-white/75 font-semibold truncate" title={isScreenShare ? `Screen - ${src.name}` : src.name}>
                {isScreenShare ? `Screen - ${src.name}` : src.name}
              </span>
            </div>
            {liveSince && (
              <span className="text-[9px] text-white/55 font-mono">since {liveSince}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Mute button — WebRTC only (RTMP audio is not controlled from the sidebar) */}
            {src.protocol === 'WebRTC' && (
              <button
                id={`studio-source-tile-${src.name}-btn-mute`}
                type="button"
                onClick={e => { e.stopPropagation(); onMuteToggle() }}
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors border',
                  isMuted
                    ? 'bg-[#3031cb]/15 border-[#3031cb]/30 text-[#3031cb] hover:bg-[#3031cb]/25'
                    : 'bg-white/4 border-white/10 text-white/55 hover:bg-white/8 hover:text-white/80',
                )}
                title={isMuted ? 'Unmute participant' : 'Mute participant'}
              >
                {isMuted ? <MicOff size={10} /> : <Mic size={10} />}
              </button>
            )}

            {/* Duplicate button — WebRTC only */}
            {onAddDuplicate && (
              <button
                id={`studio-source-tile-${src.name}-btn-duplicate`}
                type="button"
                onClick={e => { e.stopPropagation(); onAddDuplicate() }}
                className="flex items-center justify-center w-5 h-5 rounded cursor-pointer border border-white/10 bg-white/4 text-white/35 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
                title="Add duplicate"
              >
                <Copy size={10} />
              </button>
            )}

            {/* Locations button */}
            <button
              id={`studio-source-tile-${src.name}-btn-locations`}
              type="button"
              onClick={e => { e.stopPropagation(); setIsLocationsDialogOpen(true) }}
              className={cn(
                'relative flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors border',
                locations.length > 0
                  ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400/80 hover:bg-emerald-500/20'
                  : 'bg-white/4 border-white/10 text-white/35 hover:bg-white/8 hover:text-white/60',
              )}
              title="Edit locations"
            >
              <MapPin size={10} />
              {enabledLocationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center leading-none">
                  {enabledLocationCount}
                </span>
              )}
            </button>

            {isLive
              ? <span className="text-[9px] px-1 py-0.5 rounded bg-[#3031cb]/15 text-[#3031cb] border border-[#3031cb]/20 font-bold animate-pulse">LIVE</span>
              : <span className="text-[9px] px-1 py-0.5 rounded bg-white/3 text-white/55 border border-white/8">offline</span>
            }
          </div>
        </div>
      </div>

      {isLocationsDialogOpen && (
        <LocationsDialog
          sourceName={src.name}
          locations={locations}
          onLocationsChange={onLocationsChange}
          onClose={() => setIsLocationsDialogOpen(false)}
        />
      )}
    </>
  )
}

// ── Video Tile ────────────────────────────────────────────────────────────────

interface VideoTileProps {
  asset: VideoAsset
  locations: SourceLocation[]
  onLocationsChange: (locations: SourceLocation[]) => void
  onPlay: (name: string, url: string) => void
}

function VideoTile({ asset, locations, onLocationsChange, onPlay }: VideoTileProps) {
  const name = asset.name || 'Unknown'
  const purl = asset.previewurl || ''
  const poster = asset.misc?.posterPath || ''
  const playUrl = purl || getVideoBase() + asset.name
  const durFrames = asset.asset_duration || 0
  const dur = durFrames && asset.fps ? Math.round(durFrames / asset.fps) : durFrames
  const durStr = dur ? `${Math.floor(dur / 60)}m ${dur % 60}s` : '--'

  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false)
  const enabledLocationCount = locations.filter(l => l.enabled).length

  return (
    <>
      <div className="rounded-lg border-2 border-white/8 bg-white/2 hover:border-white/16 transition-colors">
        <div
          id={`studio-video-tile-${name}-preview`}
          className="relative w-full aspect-video bg-[#040810] cursor-pointer overflow-hidden rounded-t-md"
          onClick={() => onPlay(name, playUrl)}
        >
          {purl ? (
            <video src={purl} muted preload="none" poster={poster} className="w-full h-full object-cover pointer-events-none" />
          ) : poster ? (
            <img src={poster} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 text-[10px] gap-1">
              <Film size={14} /><span>{name}</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
            <div className="bg-[#3031cb]/80 rounded-full w-8 h-8 flex items-center justify-center">
              <Play size={12} className="text-white" />
            </div>
          </div>
        </div>
        <div
          id={`studio-video-tile-${name}-drag-bar`}
          className="px-1.5 py-1 cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={e => { e.dataTransfer.setData('text/plain', name); e.dataTransfer.setData('dtype', 'video'); e.dataTransfer.effectAllowed = 'copy' }}
        >
          <div className="text-[10px] text-white/75 font-semibold truncate">{name}</div>
          <div className="flex items-center justify-between text-[9px] text-white/55 mt-0.5">
            <span>{durStr}</span>
            <div className="flex items-center gap-1.5">
              <span>{asset.qc || ''}</span>
              <button
                id={`studio-video-tile-${name}-btn-locations`}
                type="button"
                onClick={e => { e.stopPropagation(); setIsLocationsDialogOpen(true) }}
                className={cn(
                  'relative flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors border',
                  locations.length > 0
                    ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400/80 hover:bg-emerald-500/20'
                    : 'bg-white/4 border-white/10 text-white/35 hover:bg-white/8 hover:text-white/60',
                )}
                title="Edit locations"
              >
                <MapPin size={10} />
                {enabledLocationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center leading-none">
                    {enabledLocationCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        <div id={`studio-video-tile-${name}-hint`} className="text-center text-[9px] text-white/40 pb-1">drag info bar to video row</div>
      </div>

      {isLocationsDialogOpen && (
        <LocationsDialog
          sourceName={name}
          locations={locations}
          onLocationsChange={onLocationsChange}
          onClose={() => setIsLocationsDialogOpen(false)}
        />
      )}
    </>
  )
}

// ── Crop Editor Dialog ────────────────────────────────────────────────────────

interface CropEditorDialogProps {
  virtualSourceName: string
  previewUrl: string
  crop: CropRegion
  isMobileSource?: boolean
  onCropChange: (crop: CropRegion, isMobileSource?: boolean) => void
  onClose: () => void
}

function CropEditorDialog({ virtualSourceName, previewUrl, crop, isMobileSource, onCropChange, onClose }: CropEditorDialogProps) {
  const [draft, setDraft] = useState<CropRegion>(crop)
  const [draftIsMobileSource, setDraftIsMobileSource] = useState(isMobileSource ?? false)

  function handleSliderChange(field: keyof CropRegion, rawValue: number) {
    setDraft(prev => {
      let clampedValue = rawValue
      if (field === 'x') clampedValue = Math.min(rawValue, 100 - prev.w)
      if (field === 'y') clampedValue = Math.min(rawValue, 100 - prev.h)
      if (field === 'w') clampedValue = Math.min(rawValue, 100 - prev.x)
      if (field === 'h') clampedValue = Math.min(rawValue, 100 - prev.y)
      return { ...prev, [field]: clampedValue }
    })
  }

  function handleApply() {
    onCropChange(draft, draftIsMobileSource)
    onClose()
  }

  const previewStyle = {
    left: `${draft.x}%`,
    top: `${draft.y}%`,
    width: `${draft.w}%`,
    height: `${draft.h}%`,
  }

  return (
    <div
      id="studio-crop-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        id="studio-crop-editor-dialog"
        className="w-80 rounded-xl border border-white/12 bg-[#0d1520] shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div id="studio-crop-editor-header" className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
          <Crop size={13} className="text-[#3031cb] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white">Crop Region</div>
            <div className="text-[9px] text-white/45 truncate">{virtualSourceName}</div>
          </div>
          <button
            id="studio-crop-editor-btn-mobile-toggle"
            type="button"
            onClick={() => setDraftIsMobileSource(prev => !prev)}
            title={draftIsMobileSource ? 'Portrait mode (9:16)' : 'Landscape mode (16:9)'}
            className={cn(
              'shrink-0 px-2 py-1 text-[9px] rounded border cursor-pointer transition-colors',
              draftIsMobileSource
                ? 'border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15'
                : 'border-white/10 bg-white/4 text-white/50 hover:bg-white/8'
            )}
          >
            {draftIsMobileSource ? 'Mobile' : 'Desktop'}
          </button>
          <button
            id="studio-crop-editor-btn-close"
            type="button"
            onClick={onClose}
            className="text-white/35 hover:text-white/70 cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Visual preview */}
        <div
          id="studio-crop-editor-preview"
          className="relative mx-3 mt-3 bg-[#040810] border border-white/10 rounded-lg overflow-hidden"
          style={{ aspectRatio: draftIsMobileSource ? '9/16' : '16/9' }}
        >
          <iframe
            id="studio-crop-editor-preview-iframe"
            src={previewUrl}
            className="absolute inset-0 w-full h-full border-none pointer-events-none"
            loading="lazy"
            scrolling="no"
          />
          {/* Rule-of-thirds grid overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-15">
            {Array.from({ length: 9 }).map((_, gridCellIndex) => (
              <div key={gridCellIndex} className="border border-white/40" />
            ))}
          </div>
          {/* Crop region: box-shadow darkens everything outside the crop area */}
          <div
            id="studio-crop-editor-preview-region"
            className="absolute border-2 border-[#3031cb] rounded pointer-events-none"
            style={{ ...previewStyle, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
          />
        </div>

        {/* Sliders */}
        <div id="studio-crop-editor-sliders" className="flex flex-col gap-2.5 px-3 py-3">
          {(['x', 'y', 'w', 'h'] as const).map(field => (
            <div id={`studio-crop-editor-slider-${field}`} key={field} className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 w-3 shrink-0 font-mono">{field}</span>
              <input
                id={`studio-crop-editor-input-${field}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft[field]}
                onChange={e => handleSliderChange(field, Number(e.target.value))}
                className="flex-1 accent-[#3031cb] cursor-pointer"
              />
              <span className="text-[10px] text-white/70 w-8 text-right font-mono shrink-0">{draft[field]}%</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div id="studio-crop-editor-actions" className="flex gap-2 px-3 pb-3">
          <button
            id="studio-crop-editor-btn-reset"
            type="button"
            onClick={() => setDraft({ x: 0, y: 0, w: 100, h: 100 })}
            className="flex-1 py-1.5 text-[11px] rounded-lg border border-white/10 bg-white/4 text-white/40 hover:text-white/70 hover:bg-white/8 cursor-pointer transition-colors"
          >
            Reset
          </button>
          <button
            id="studio-crop-editor-btn-cancel"
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 text-[11px] rounded-lg border border-white/10 bg-white/4 text-white/55 hover:bg-white/8 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            id="studio-crop-editor-btn-apply"
            type="button"
            onClick={handleApply}
            className="flex-1 py-1.5 text-[11px] rounded-lg bg-[#3031cb] hover:bg-[#2626a8] text-white font-semibold cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Virtual Source Tile ───────────────────────────────────────────────────────

interface VirtualSourceTileProps {
  virtualSource: VirtualSource
  previewUrl: string
  locations: SourceLocation[]
  onUpdate: (patch: Partial<Pick<VirtualSource, 'name' | 'crop' | 'isMobileSource'>>) => void
  onRemove: () => void
  onLocationsChange: (locations: SourceLocation[]) => void
}

function VirtualSourceTile({ virtualSource, previewUrl, locations, onUpdate, onRemove, onLocationsChange }: VirtualSourceTileProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(virtualSource.name)
  const [isCropEditorOpen, setIsCropEditorOpen] = useState(false)
  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false)
  const enabledLocationCount = locations.filter(l => l.enabled).length

  function handleNameCommit() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== virtualSource.name) onUpdate({ name: trimmed })
    else setNameInput(virtualSource.name)
    setIsEditingName(false)
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleNameCommit()
    if (e.key === 'Escape') { setNameInput(virtualSource.name); setIsEditingName(false) }
  }

  const { x, y, w, h } = virtualSource.crop

  return (
    <>
      <div
        id={`studio-virtual-source-tile-${virtualSource.id}`}
        className="rounded-lg border border-white/8 border-dashed bg-white/2 px-2 py-1.5"
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', virtualSource.id)
          e.dataTransfer.setData('dtype', 'participant')
          e.dataTransfer.setData('sourceType', 'webrtc')
          e.dataTransfer.setData('isScreenShare', '0')
          e.dataTransfer.effectAllowed = 'copy'
        }}
      >
        <div id={`studio-virtual-source-tile-${virtualSource.id}-row`} className="flex items-center gap-1.5">
          {/* Virtual indicator */}
          <Copy size={9} className="text-amber-400/70 shrink-0" />

          {/* Name — inline edit */}
          {isEditingName ? (
            <input
              id={`studio-virtual-source-tile-${virtualSource.id}-name-input`}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={handleNameKeyDown}
              className="flex-1 text-[10px] bg-white/8 border border-white/20 rounded px-1 py-0.5 text-white outline-hidden focus:border-[#3031cb]/50"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          ) : (
            <span
              id={`studio-virtual-source-tile-${virtualSource.id}-name`}
              className="flex-1 text-[10px] text-amber-300/80 font-semibold truncate cursor-pointer hover:text-amber-300"
              title={virtualSource.name}
              onClick={() => { setNameInput(virtualSource.name); setIsEditingName(true) }}
            >
              {virtualSource.name}
            </span>
          )}

          <div id={`studio-virtual-source-tile-${virtualSource.id}-actions`} className="flex items-center gap-1 shrink-0">
            {isEditingName ? (
              <button
                id={`studio-virtual-source-tile-${virtualSource.id}-btn-commit-name`}
                type="button"
                onClick={handleNameCommit}
                className="flex items-center justify-center w-5 h-5 rounded cursor-pointer text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Save name"
              >
                <Check size={11} />
              </button>
            ) : (
              <button
                id={`studio-virtual-source-tile-${virtualSource.id}-btn-rename`}
                type="button"
                onClick={() => { setNameInput(virtualSource.name); setIsEditingName(true) }}
                className="flex items-center justify-center w-5 h-5 rounded cursor-pointer text-white/30 hover:text-white/70 transition-colors"
                title="Rename"
              >
                <Pencil size={10} />
              </button>
            )}
            <button
              id={`studio-virtual-source-tile-${virtualSource.id}-btn-crop`}
              type="button"
              onClick={() => setIsCropEditorOpen(true)}
              className="flex items-center justify-center w-5 h-5 rounded cursor-pointer border border-white/10 bg-white/4 text-white/50 hover:bg-[#3031cb]/15 hover:border-[#3031cb]/30 hover:text-[#3031cb] transition-colors"
              title="Edit crop region"
            >
              <Crop size={10} />
            </button>
            <button
              id={`studio-virtual-source-tile-${virtualSource.id}-btn-locations`}
              type="button"
              onClick={() => setIsLocationsDialogOpen(true)}
              className={cn(
                'relative flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors border',
                locations.length > 0
                  ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400/80 hover:bg-emerald-500/20'
                  : 'bg-white/4 border-white/10 text-white/35 hover:bg-white/8 hover:text-white/60',
              )}
              title="Edit locations"
            >
              <MapPin size={10} />
              {enabledLocationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center leading-none">
                  {enabledLocationCount}
                </span>
              )}
            </button>
            <button
              id={`studio-virtual-source-tile-${virtualSource.id}-btn-remove`}
              type="button"
              onClick={onRemove}
              className="flex items-center justify-center w-5 h-5 rounded cursor-pointer text-white/20 hover:text-[#3031cb] transition-colors"
              title="Remove duplicate"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        {/* Crop summary and mobile flag */}
        <div id={`studio-virtual-source-tile-${virtualSource.id}-crop-summary`} className="mt-1 flex items-center justify-between">
          <div className="text-[9px] text-white/35 font-mono">x:{x}% y:{y}% w:{w}% h:{h}%</div>
          {virtualSource.isMobileSource && (
            <span id={`studio-virtual-source-tile-${virtualSource.id}-mobile-badge`} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Mobile</span>
          )}
        </div>
      </div>

      {isCropEditorOpen && (
        <CropEditorDialog
          virtualSourceName={virtualSource.name}
          previewUrl={previewUrl}
          crop={virtualSource.crop}
          isMobileSource={virtualSource.isMobileSource}
          onCropChange={(crop, isMobileSource) => onUpdate({ crop, isMobileSource })}
          onClose={() => setIsCropEditorOpen(false)}
        />
      )}
      {isLocationsDialogOpen && (
        <LocationsDialog
          sourceName={virtualSource.name}
          locations={locations}
          onLocationsChange={onLocationsChange}
          onClose={() => setIsLocationsDialogOpen(false)}
        />
      )}
    </>
  )
}

// ── Source Group (main tile + collapsible dups accordion) ────────────────────

interface SourceGroupProps {
  src: AnySource
  previewUrl: string
  locations: SourceLocation[]
  isMuted: boolean
  duplicates: VirtualSource[]
  duplicateLocations: Record<string, SourceLocation[]>
  onLocationsChange: (locations: SourceLocation[]) => void
  onMuteToggle: () => void
  onAddDuplicate: (() => void) | undefined
  onUpdateDuplicate: (id: string, patch: Partial<Pick<VirtualSource, 'name' | 'crop' | 'isMobileSource'>>) => void
  onRemoveDuplicate: (id: string) => void
  onUpdateDuplicateLocations: (id: string, locations: SourceLocation[]) => void
}

function SourceGroup({
  src, previewUrl, locations, isMuted, duplicates, duplicateLocations,
  onLocationsChange, onMuteToggle, onAddDuplicate, onUpdateDuplicate, onRemoveDuplicate, onUpdateDuplicateLocations,
}: SourceGroupProps) {
  const [isDupsOpen, setIsDupsOpen] = useState(false)
  const dupCount = duplicates.length

  return (
    <div id={`studio-sidebar-source-group-${src.name}`} className="flex flex-col">
      <SourceTile
        src={src}
        previewUrl={previewUrl}
        locations={locations}
        onLocationsChange={onLocationsChange}
        isMuted={isMuted}
        onMuteToggle={onMuteToggle}
        onAddDuplicate={onAddDuplicate}
      />
      {dupCount > 0 && (
        <>
          {/* Accordion toggle */}
          <button
            id={`studio-sidebar-source-group-${src.name}-dups-toggle`}
            type="button"
            onClick={() => setIsDupsOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 text-[9px] text-amber-400/60 hover:text-amber-400/90 cursor-pointer transition-colors border-t border-dashed border-white/5"
          >
            <ChevronDown
              size={10}
              className={cn('transition-transform duration-150', isDupsOpen ? 'rotate-180' : '')}
            />
            <Copy size={8} />
            <span>{dupCount} dup{dupCount > 1 ? 's' : ''}</span>
          </button>

          {/* Dup tiles */}
          {isDupsOpen && (
            <div id={`studio-sidebar-source-group-${src.name}-dups`} className="flex flex-col gap-1 pl-2 pt-1">
              {duplicates.map(v => (
                <VirtualSourceTile
                  key={v.id}
                  virtualSource={v}
                  previewUrl={previewUrl}
                  locations={duplicateLocations[v.id] ?? []}
                  onUpdate={patch => onUpdateDuplicate(v.id, patch)}
                  onRemove={() => onRemoveDuplicate(v.id)}
                  onLocationsChange={locs => onUpdateDuplicateLocations(v.id, locs)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Add RTMP Dialog ───────────────────────────────────────────────────────────

interface AddRtmpDialogProps {
  channel: string
  rtmpUrlPrefix: string
  existingStreamNames: string[]
  onCreate: (name: string) => Promise<void>
  onClose: () => void
  onSuccess: () => void
  onError: (message: string) => void
}

function AddRtmpDialog({ channel, rtmpUrlPrefix, existingStreamNames, onCreate, onClose, onSuccess, onError }: AddRtmpDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [streamKey, setStreamKey] = useState('')
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false)
  const [isUrlCopied, setIsUrlCopied] = useState(false)
  const rtmpUrl = `${rtmpUrlPrefix}${channel}`
  const trimmedStreamKey = streamKey.trim()
  const existingStreamNamesLower = useMemo(
    () => new Set(existingStreamNames.map(n => n.trim().toLowerCase())),
    [existingStreamNames],
  )
  const isDuplicateStreamKey = trimmedStreamKey.length > 0 && existingStreamNamesLower.has(trimmedStreamKey.toLowerCase())
  const isStreamKeyValid = trimmedStreamKey.length > 0 && !isDuplicateStreamKey

  function copyRtmpUrl() {
    navigator.clipboard.writeText(rtmpUrl)
    setIsUrlCopied(true)
    setTimeout(() => setIsUrlCopied(false), 2000)
  }

  async function handleCreateClick() {
    if (isPending || !channel || !isStreamKeyValid) return
    setIsPending(true)
    try {
      await onCreate(channel)
      onSuccess()
      onClose()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div
      id="studio-rtmp-add-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div
        id="studio-rtmp-add-dialog"
        className="w-80 rounded-xl border border-white/12 bg-[#0d1520] shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div id="studio-rtmp-add-dialog-header" className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
          <Radio size={13} className="text-[#3031cb] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white">Add RTMP Source</div>
            <div className="text-[9px] text-white/45 truncate">{channel || 'No channel selected'}</div>
          </div>
          <button
            id="studio-rtmp-add-dialog-btn-close"
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-white/35 hover:text-white/70 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div id="studio-rtmp-add-dialog-body" className="flex flex-col gap-2.5 px-3 py-3">
          <div id="studio-rtmp-add-dialog-field-url" className="flex flex-col gap-1">
            <label htmlFor="studio-rtmp-add-dialog-input-url" className="text-[10px] text-white/50 font-semibold">RTMP URL</label>
            <div className="relative">
              <input
                id="studio-rtmp-add-dialog-input-url"
                type="text"
                value={rtmpUrl}
                readOnly
                className="w-full text-[11px] bg-white/4 border border-white/8 rounded-lg pl-2 pr-8 py-1.5 text-white/70 font-mono outline-hidden"
              />
              <button
                id="studio-rtmp-add-dialog-btn-copy-url"
                type="button"
                onClick={copyRtmpUrl}
                aria-label={isUrlCopied ? 'Copied' : 'Copy RTMP URL'}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors',
                  isUrlCopied ? 'text-emerald-400' : 'text-white/45 hover:text-white/80',
                )}
              >
                {isUrlCopied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>
          <div id="studio-rtmp-add-dialog-field-stream-key" className="flex flex-col gap-1">
            <label htmlFor="studio-rtmp-add-dialog-input-stream-key" className="text-[10px] text-white/50 font-semibold">
              Stream Key <span className="text-[#3031cb]">*</span>
            </label>
            <div className="relative">
              <input
                id="studio-rtmp-add-dialog-input-stream-key"
                type={isStreamKeyVisible ? 'text' : 'password'}
                value={streamKey}
                onChange={e => setStreamKey(e.target.value)}
                disabled={isPending}
                placeholder="Enter stream key"
                aria-invalid={isDuplicateStreamKey}
                className={cn(
                  'w-full text-[11px] bg-white/4 border rounded-lg pl-2 pr-8 py-1.5 text-white font-mono outline-hidden disabled:opacity-50',
                  isDuplicateStreamKey ? 'border-[#3031cb] focus:border-[#3031cb]' : 'border-white/8 focus:border-white/25',
                )}
              />
              <button
                id="studio-rtmp-add-dialog-btn-toggle-stream-key"
                type="button"
                onClick={() => setIsStreamKeyVisible(v => !v)}
                aria-label={isStreamKeyVisible ? 'Hide stream key' : 'Show stream key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/80 cursor-pointer transition-colors"
              >
                {isStreamKeyVisible ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
            {isDuplicateStreamKey && (
              <span id="studio-rtmp-add-dialog-error-stream-key" className="text-[10px] text-[#3031cb]">
                A stream with this name already exists.
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div id="studio-rtmp-add-dialog-actions" className="flex gap-2 px-3 pb-3">
          <button
            id="studio-rtmp-add-dialog-btn-cancel"
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-1.5 text-[11px] rounded-lg border border-white/10 bg-white/4 text-white/55 hover:bg-white/8 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            id="studio-rtmp-add-dialog-btn-create"
            type="button"
            onClick={handleCreateClick}
            disabled={isPending || !channel || !isStreamKeyValid}
            className="flex-1 py-1.5 text-[11px] rounded-lg bg-[#3031cb] hover:bg-[#2626a8] text-white font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sources Sidebar ───────────────────────────────────────────────────────────

export function SourcesSidebar() {
  const {
    channel,
    currentTab, setCurrentTab, webrtcSources, rtmpSources, videoAssets,
    fetchParticipants, fetchRtmp, fetchVideos, fetchAllSources, createRtmpApplication, buildStreamPreviewUrl, openVideoPopup,
    sourceLocations, updateSourceLocations,
    participantMuteMap, muteParticipant,
    virtualSources, addVirtualSource, removeVirtualSource, updateVirtualSource,
    activeRowIdx, rows, showToast, compactPoolSelectedValues,
  } = useStudioCtx()

  function handleRemoveDuplicate(dupId: string) {
    if (compactPoolSelectedValues.has(dupId)) {
      showToast(
        'Duplicate is selected',
        'This duplicate is checked in the compact source pool. Uncheck it first.',
        'warning',
      )
      return
    }
    if (activeRowIdx !== null) {
      const activeRow = rows[activeRowIdx]
      const isInActiveRow = activeRow.sources.some(
        s => s.sourceType === 'webrtc' && s.sourceValue === dupId
      )
      if (isInActiveRow) {
        showToast(
          'Duplicate in use',
          `This duplicate is assigned in Q${activeRowIdx + 1} (currently active). Remove it from the Q row first.`,
          'warning',
        )
        return
      }
    }
    removeVirtualSource(dupId)
  }

  const [allPending, setAllPending] = useState(false)
  const [tabPending, setTabPending] = useState(false)
  const [videoSearch, setVideoSearch] = useState('')
  const [isAddRtmpDialogOpen, setIsAddRtmpDialogOpen] = useState(false)
  const [rtmpStatusFilter, setRtmpStatusFilter] = useState<'all' | 'online' | 'offline'>('online')

  const tabs = [
    { key: 'webrtc' as const, label: 'WebRTC', icon: <Wifi size={10} />, count: webrtcSources.length },
    { key: 'rtmp' as const, label: 'RTMP', icon: <Radio size={10} />, count: rtmpSources.length },
    { key: 'video' as const, label: 'Videos', icon: <Film size={10} />, count: videoAssets.length },
  ]

  const filteredRtmpSources = rtmpStatusFilter === 'all'
    ? rtmpSources
    : rtmpStatusFilter === 'online'
      ? rtmpSources.filter(s => s.status === 'online' || s.status === 'live')
      : rtmpSources.filter(s => s.status !== 'online' && s.status !== 'live')
  const sources = currentTab === 'webrtc' ? webrtcSources : filteredRtmpSources
  const fetchCurrent = currentTab === 'webrtc' ? fetchParticipants : currentTab === 'rtmp' ? fetchRtmp : fetchVideos

  async function handleRefreshAll() {
    if (allPending) return
    setAllPending(true)
    try { await fetchAllSources() } finally { setAllPending(false) }
  }

  async function handleRefreshCurrent() {
    if (tabPending) return
    setTabPending(true)
    try { await fetchCurrent() } finally { setTabPending(false) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-white/6">
        <Radio size={11} className="text-[#3031cb] shrink-0" />
        <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider flex-1">Sources</span>
        <button
          id="studio-sidebar-btn-refresh-all"
          type="button"
          onClick={handleRefreshAll}
          disabled={allPending}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg border border-white/8 bg-white/3 text-white/45 hover:text-white/80 hover:bg-white/7 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={9} className={allPending ? 'animate-spin' : ''} /> {allPending ? 'Refreshing…' : 'Refresh All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-white/6">
        {tabs.map(t => (
          <button
            key={t.key}
            id={`studio-sidebar-tab-${t.key}`}
            type="button"
            onClick={() => setCurrentTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold cursor-pointer border-b-2 transition-colors',
              currentTab === t.key ? 'text-white border-[#3031cb]' : 'text-white/55 border-transparent hover:text-white',
            )}
          >
            {t.icon}{t.label}
            {t.count > 0 && (
              <span className={cn('px-1 py-0.5 rounded text-[8px] font-bold leading-none', currentTab === t.key ? 'bg-[#3031cb]/20 text-[#3031cb]' : 'bg-white/8 text-white/50')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Per-panel refresh */}
      <div className="shrink-0 flex items-center justify-end gap-1.5 px-2 py-1 border-b border-white/4">
        {currentTab === 'rtmp' && (
          <>
            <select
              id="studio-sidebar-rtmp-filter"
              aria-label="Filter RTMP sources by status"
              value={rtmpStatusFilter}
              onChange={e => setRtmpStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
              className="text-[10px] bg-white/3 border border-white/8 rounded-lg px-1.5 py-0.5 text-white/65 hover:text-white/85 cursor-pointer outline-hidden transition-colors"
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <button
              id="studio-sidebar-btn-add-rtmp"
              type="button"
              onClick={() => setIsAddRtmpDialogOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg border border-white/8 bg-white/3 text-white/45 hover:text-[#3031cb] hover:border-[#3031cb]/30 hover:bg-[#3031cb]/10 cursor-pointer transition-colors"
              title="Add RTMP source"
            >
              <Plus size={9} /> Add RTMP
            </button>
          </>
        )}
        <button
          id="studio-sidebar-btn-refresh-current"
          type="button"
          onClick={handleRefreshCurrent}
          disabled={tabPending}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg border border-white/8 bg-white/3 text-white/45 hover:text-white/80 hover:bg-white/7 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={9} className={tabPending ? 'animate-spin' : ''} /> {tabPending ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Video search */}
      {currentTab === 'video' && (
        <div className="shrink-0 px-1.5 py-1 border-b border-white/4">
          <div className="relative flex items-center">
            <Search size={10} className="pointer-events-none absolute left-2 text-white/35" />
            <input
              id="studio-sidebar-video-search"
              type="text"
              value={videoSearch}
              onChange={(e) => setVideoSearch(e.target.value)}
              placeholder="Search videos…"
              className="h-6 w-full rounded-md border border-white/8 bg-white/3 pl-6 pr-6 text-[10px] text-white/75 placeholder-white/30 outline-none transition-colors hover:border-white/15 focus:border-white/25"
            />
            {videoSearch && (
              <button
                id="studio-sidebar-btn-clear-video-search"
                type="button"
                onClick={() => setVideoSearch('')}
                className="absolute right-2 cursor-pointer text-white/35 hover:text-white/70"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div id="studio-sidebar-source-list" className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-2">
        {currentTab === 'video' ? (
          (() => {
            const filtered = videoSearch.trim()
              ? videoAssets.filter(a => (a.name || '').toLowerCase().includes(videoSearch.toLowerCase()))
              : videoAssets
            return filtered.length === 0
              ? <div className="text-center text-[11px] text-white/50 pt-8">{videoSearch ? 'No matches.' : 'No videos.'}<br />{!videoSearch && 'Click Refresh.'}</div>
              : filtered.map((a, index) => (
                <VideoTile
                  key={`${a.name}-${index}`}
                  asset={a}
                  locations={sourceLocations[a.name ?? ''] ?? []}
                  onLocationsChange={locations => updateSourceLocations(a.name ?? '', locations)}
                  onPlay={openVideoPopup}
                />
              ))
          })()
        ) : (
          sources.length === 0
            ? <div className="text-center text-[11px] text-white/50 pt-8">No {currentTab.toUpperCase()} sources.<br />Click Refresh.</div>
            : sources.map(src => (
              <SourceGroup
                key={src.id}
                src={src}
                previewUrl={buildStreamPreviewUrl(src) ?? ''}
                locations={sourceLocations[src.name] ?? []}
                onLocationsChange={locations => updateSourceLocations(src.name, locations)}
                isMuted={participantMuteMap[src.name] ?? false}
                onMuteToggle={() => muteParticipant(src.name, !(participantMuteMap[src.name] ?? false))}
                onAddDuplicate={currentTab === 'webrtc' ? () => addVirtualSource(src.name) : undefined}
                duplicates={virtualSources.filter(v => v.sourceUserId === src.name)}
                duplicateLocations={sourceLocations}
                onUpdateDuplicate={(id, patch) => updateVirtualSource(id, patch)}
                onRemoveDuplicate={id => handleRemoveDuplicate(id)}
                onUpdateDuplicateLocations={(id, locs) => updateSourceLocations(id, locs)}
              />
            ))
        )}
      </div>

      <div className="shrink-0 text-center text-[9px] text-white/40 py-1 border-t border-white/4">
        {currentTab === 'video' ? 'drag info bar to video row' : 'drag name bar to assign'}
      </div>

      {isAddRtmpDialogOpen && (
        <AddRtmpDialog
          channel={channel}
          rtmpUrlPrefix={RTMP_PUBLISH_URL_PREFIX}
          existingStreamNames={rtmpSources.map(s => s.name)}
          onCreate={createRtmpApplication}
          onClose={() => setIsAddRtmpDialogOpen(false)}
          onSuccess={() => showToast('Studio feed ready', 'Latest RTMP sources will be refreshed in a few seconds.', 'success')}
          onError={message => showToast('Failed to add RTMP source', message, 'error')}
        />
      )}
    </div>
  )
}
