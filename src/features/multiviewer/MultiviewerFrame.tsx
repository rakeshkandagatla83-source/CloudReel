import { useState, useRef } from 'react'
import * as Select from '@radix-ui/react-select'
import { X, GripVertical, ChevronDown, Check, Tv } from 'lucide-react'
import { cn } from '../../lib/utils'
import { buildStreamUrl } from './types'
import type { Frame, Source, FrameType, MultiviewerConfig } from './types'

interface MultiviewerFrameProps {
  frame: Frame
  config: MultiviewerConfig
  rtmpSources: Source[]
  webrtcSources: Source[]
  usedKeys: Set<string>
  isDragOver: boolean
  onRemove: () => void
  onUpdate: (patch: Partial<Frame>) => void
  onSendToPreview: (url: string) => void
  onSendToProgram: (url: string) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

const TYPE_OPTIONS = [
  { value: 'webrtc', label: 'WebRTC' },
  { value: 'rtmp', label: 'RTMP' },
]

export function MultiviewerFrame({
  frame,
  config,
  rtmpSources,
  webrtcSources,
  usedKeys,
  isDragOver,
  onRemove,
  onUpdate,
  // onSendToPreview,
  // onSendToProgram,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: MultiviewerFrameProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(frame.label)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const streamUrl = buildStreamUrl(config, frame.type, frame.source)
  const sources = frame.type === 'rtmp' ? rtmpSources : frame.type === 'webrtc' ? webrtcSources : []
  const displayLabel = frame.label || frame.source
  const sourceStatus = sources.find(s => s.name === frame.source)?.status
  const isLive = Boolean(streamUrl)

  function startEditLabel() {
    setLabelDraft(frame.label || frame.source || '')
    setEditingLabel(true)
    setTimeout(() => labelInputRef.current?.select(), 0)
  }

  function commitLabel() {
    setEditingLabel(false)
    onUpdate({ label: labelDraft.trim() })
  }

  function handleTypeChange(type: string) {
    onUpdate({ type: type as FrameType, source: '' })
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'flex flex-col rounded-xl border-2 overflow-hidden bg-surface-2 transition-all duration-150 min-h-52',
        isLive
          ? 'border-red-500/40 shadow-[0_0_14px_#ef444418]'
          : 'border-primary-border hover:border-[#3031cb]/30',
        isDragOver && 'border-[#3031cb]/50 shadow-[0_0_14px_#3031cb18]',
      )}
    >
      {/* VIDEO AREA */}
      <div className="relative flex-1 overflow-hidden bg-black group" style={{ isolation: 'isolate' }}>
        {streamUrl ? (
          <iframe
            key={streamUrl}
            src={streamUrl}
            className="w-full h-full border-none"
            scrolling="no"
            allowFullScreen
            title={displayLabel || `Frame ${frame.id}`}
            style={{ overflow: 'hidden' }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-secondary-text">
            <Tv size={30} />
            <span className="text-[10px] tracking-wider">No source selected</span>
          </div>
        )}

        {/* Label overlay */}
        <div className="absolute left-2 top-2 z-10">
          {editingLabel ? (
            <input
              ref={labelInputRef}
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') setEditingLabel(false)
              }}
              className="w-28 rounded bg-black/80 border border-white/20 px-2 py-0.5 text-[10px] text-white outline-hidden"
              autoFocus
            />
          ) : (
            displayLabel && (
              <span
                onDoubleClick={startEditLabel}
                title="Double-click to rename"
                className="cursor-text select-none rounded bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/65"
              >
                {displayLabel}
              </span>
            )
          )}
        </div>

        {/* Status dot */}
        <div className="absolute right-2 top-2 z-10">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isLive && sourceStatus !== 'offline'
                ? 'bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse'
                : isLive
                ? 'bg-yellow-500/60'
                : 'bg-white/10',
            )}
          />
        </div>

        {/* Send to Preview / Program - visible on hover */}
        {/* {streamUrl && (
          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onSendToPreview(streamUrl)}
              className="flex items-center gap-1 rounded-md bg-[#3031cb]/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-[#3031cb] cursor-pointer"
            >
              <MonitorPlay size={11} />
              Preview
            </button>
            <button
              type="button"
              onClick={() => onSendToProgram(streamUrl)}
              className="flex items-center gap-1 rounded-md bg-red-500/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-red-500 cursor-pointer"
            >
              <Radio size={11} />
              Program
            </button>
          </div>
        )} */}
      </div>

      {/* CONTROLS BAR */}
      <div className="flex shrink-0 items-center gap-1.5 border-t border-primary-border bg-surface px-2 py-1.5">
        <GripVertical
          size={13}
          className="shrink-0 cursor-grab text-secondary-text/30 active:cursor-grabbing"
        />

        {/* Type */}
        <Select.Root value={frame.type || ''} onValueChange={handleTypeChange}>
          <Select.Trigger
            className={cn(
              'flex flex-1 cursor-pointer items-center gap-1 rounded-md border border-primary-border',
              'bg-surface-2 px-2 py-1 text-[10px] text-secondary-text transition-colors',
              'hover:border-[#3031cb]/30 outline-hidden data-placeholder:text-secondary-text/50',
            )}
          >
            <Select.Value placeholder="Type" />
            <Select.Icon className="ml-auto shrink-0">
              <ChevronDown size={9} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={4}
              className={cn(
                'z-200 min-w-28 bg-surface border border-primary-border rounded-lg shadow-2xl overflow-hidden',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <Select.Viewport className="p-1">
                {TYPE_OPTIONS.map(opt => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[11px] text-secondary-text outline-hidden select-none data-highlighted:bg-surface-2 data-highlighted:text-primary-text"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    <Select.ItemIndicator className="ml-auto">
                      <Check size={10} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Source */}
        <Select.Root
          value={frame.source || ''}
          onValueChange={source => onUpdate({ source })}
          disabled={!frame.type}
        >
          <Select.Trigger
            className={cn(
              'flex flex-2 cursor-pointer items-center gap-1 rounded-md border border-primary-border',
              'bg-surface-2 px-2 py-1 text-[10px] text-secondary-text transition-colors',
              'hover:border-[#3031cb]/30 outline-hidden data-placeholder:text-secondary-text/50',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Select.Value placeholder="Source" />
            <Select.Icon className="ml-auto shrink-0">
              <ChevronDown size={9} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={4}
              className={cn(
                'z-200 min-w-44 max-h-60 bg-surface border border-primary-border rounded-lg shadow-2xl overflow-hidden',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <Select.Viewport className="p-1">
                {sources.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] italic text-secondary-text/50">No sources</div>
                ) : (
                  sources.map(s => {
                    const key = `${frame.type}:${s.name}`
                    const isUsed = usedKeys.has(key) && s.name !== frame.source
                    return (
                      <Select.Item
                        key={s.id}
                        value={s.name}
                        disabled={isUsed}
                        className={cn(
                          'flex cursor-pointer items-center rounded-md px-3 py-1.5 text-[11px] outline-hidden select-none',
                          isUsed
                            ? 'cursor-not-allowed text-secondary-text/40'
                            : 'text-secondary-text data-highlighted:bg-surface-2 data-highlighted:text-primary-text',
                        )}
                      >
                        <Select.ItemText>{s.name}</Select.ItemText>
                        {s.status === 'live' && !isUsed && (
                          <span className="ml-1.5 shrink-0 text-[9px] text-red-400">[live]</span>
                        )}
                        {s.status && s.status !== 'live' && !isUsed && (
                          <span className="ml-1.5 shrink-0 text-[9px] text-secondary-text/50">
                            [{s.status}]
                          </span>
                        )}
                        {isUsed && (
                          <span className="ml-1.5 shrink-0 text-[9px] text-secondary-text/50">in use</span>
                        )}
                        <Select.ItemIndicator className="ml-auto shrink-0 pl-1.5">
                          <Check size={10} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    )
                  })
                )}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Badge */}
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold',
            frame.type === 'webrtc'
              ? 'border border-[#3031cb]/15 bg-[#3031cb]/8 text-[#3031cb]/70'
              : frame.type === 'rtmp'
              ? 'border border-orange-500/15 bg-orange-500/8 text-orange-400/70'
              : 'border border-primary-border bg-surface-2 text-secondary-text/50',
          )}
        >
          {frame.type ? frame.type.toUpperCase() : '--'}
        </span>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 cursor-pointer p-0.5 text-secondary-text transition-colors hover:text-red-400"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
