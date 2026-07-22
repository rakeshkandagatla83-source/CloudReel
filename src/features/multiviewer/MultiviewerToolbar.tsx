import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { LayoutType } from './types'

interface MultiviewerToolbarProps {
  frameCount: number
  layout: LayoutType
  sourcesLoading: boolean
  onAddFrame: () => void
  onClearAll: () => void
  onLayoutChange: (l: LayoutType) => void
  onRefresh: () => void
}

const LAYOUTS: { value: LayoutType; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
]

export function MultiviewerToolbar({
  frameCount,
  layout,
  sourcesLoading,
  onAddFrame,
  onClearAll,
  onLayoutChange,
  onRefresh,
}: MultiviewerToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-primary-border bg-surface-2 px-4 py-2">
      <button
        type="button"
        onClick={onAddFrame}
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-primary-border bg-surface px-4 text-base font-medium text-secondary-text transition-colors hover:bg-surface-2 hover:text-primary-text"
      >
        <Plus size={16} />
        Add Frame
      </button>

      {frameCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/15 bg-red-500/5 px-4 text-base font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={16} />
          Clear All
        </button>
      )}

      <div className="h-4 w-px shrink-0 bg-primary-border" />

      <span className="text-base text-secondary-text">Layout:</span>
      <div className="flex items-center gap-1">
        {LAYOUTS.map(l => (
          <button
            key={l.value}
            type="button"
            onClick={() => onLayoutChange(l.value)}
            className={cn(
              'flex h-8 items-center cursor-pointer rounded-md px-3 text-base font-medium transition-colors',
              layout === l.value
                ? 'border border-[#3031cb]/25 bg-[#3031cb]/12 text-[#3031cb]'
                : 'border border-transparent text-secondary-text hover:border-primary-border hover:text-primary-text',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px shrink-0 bg-primary-border" />

      <button
        type="button"
        onClick={onRefresh}
        disabled={sourcesLoading}
        title="Refresh stream sources"
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-primary-border bg-surface px-4 text-base font-medium text-secondary-text transition-colors hover:bg-surface-2 hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw size={16} className={cn(sourcesLoading && 'animate-spin')} />
        Refresh
      </button>

      <div className="ml-auto text-base tabular-nums text-secondary-text">
        {frameCount} {frameCount === 1 ? 'frame' : 'frames'}
      </div>
    </div>
  )
}
