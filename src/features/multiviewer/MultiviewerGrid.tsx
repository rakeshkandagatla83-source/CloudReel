import { useState, useMemo } from 'react'
import { Plus, LayoutGrid } from 'lucide-react'
import { cn } from '../../lib/utils'
import { MultiviewerFrame } from './MultiviewerFrame'
import type { Frame, Source, LayoutType, MultiviewerConfig } from './types'

interface MultiviewerGridProps {
  frames: Frame[]
  layout: LayoutType
  config: MultiviewerConfig
  rtmpSources: Source[]
  webrtcSources: Source[]
  onAddFrame: () => void
  onRemoveFrame: (id: number) => void
  onUpdateFrame: (id: number, patch: Partial<Frame>) => void
  onReorderFrames: (fromIdx: number, toIdx: number) => void
  onSendToPreview: (url: string) => void
  onSendToProgram: (url: string) => void
}

const LAYOUT_CLASSES: Record<LayoutType, string> = {
  auto: 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]',
  '2': 'grid-cols-2',
  '3': 'grid-cols-3',
  '4': 'grid-cols-4',
}

export function MultiviewerGrid({
  frames,
  layout,
  config,
  rtmpSources,
  webrtcSources,
  onAddFrame,
  onRemoveFrame,
  onUpdateFrame,
  onReorderFrames,
  onSendToPreview,
  onSendToProgram,
}: MultiviewerGridProps) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const usedKeys = useMemo(
    () =>
      new Set(
        frames.filter(f => f.type && f.source).map(f => `${f.type}:${f.source}`),
      ),
    [frames],
  )

  if (frames.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-secondary-text/30">
        <LayoutGrid size={48} strokeWidth={1} />
        <div className="text-center">
          <p className="text-sm font-medium tracking-wider text-secondary-text">NO FRAMES ADDED</p>
          <p className="mt-1 text-[11px] text-secondary-text/60">
            Click &quot;Add Frame&quot; to build your multiviewer
          </p>
        </div>
        <button
          type="button"
          onClick={onAddFrame}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary-border px-4 py-2 text-xs text-secondary-text transition-colors hover:bg-surface-2 hover:text-primary-text"
        >
          <Plus size={13} />
          Add First Frame
        </button>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3 p-3 content-start', LAYOUT_CLASSES[layout])}>
      {frames.map((frame, idx) => (
        <MultiviewerFrame
          key={frame.id}
          frame={frame}
          config={config}
          rtmpSources={rtmpSources}
          webrtcSources={webrtcSources}
          usedKeys={usedKeys}
          isDragOver={overIdx === idx && dragId !== frame.id}
          onRemove={() => onRemoveFrame(frame.id)}
          onUpdate={patch => onUpdateFrame(frame.id, patch)}
          onSendToPreview={onSendToPreview}
          onSendToProgram={onSendToProgram}
          onDragStart={e => {
            e.dataTransfer.effectAllowed = 'move'
            setDragId(frame.id)
          }}
          onDragOver={e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setOverIdx(idx)
          }}
          onDrop={e => {
            e.preventDefault()
            if (dragId === null) return
            const fromIdx = frames.findIndex(f => f.id === dragId)
            if (fromIdx !== -1 && fromIdx !== idx) {
              onReorderFrames(fromIdx, idx)
            }
            setDragId(null)
            setOverIdx(null)
          }}
          onDragEnd={() => {
            setDragId(null)
            setOverIdx(null)
          }}
        />
      ))}

      {/* Add frame card */}
      <button
        type="button"
        onClick={onAddFrame}
        className={cn(
          'flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl',
          'border-2 border-dashed border-primary-border text-secondary-text transition-all duration-150',
          'hover:border-[#3031cb]/25 hover:bg-[#3031cb]/5 hover:text-[#3031cb]/60',
        )}
      >
        <Plus size={24} strokeWidth={1.5} />
        <span className="text-[10px] font-medium tracking-wider">ADD FRAME</span>
      </button>
    </div>
  )
}
