import { Radio, ImageIcon, Layers } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Source } from '../../types/layoutBuilder'

interface ToolboxSidebarProps {
  sources: Source[]
  selectedId: string | null
  onAddSource: () => void
  onOpenBackground: () => void
  onSelectLayer: (id: string) => void
}

export function ToolboxSidebar({
  sources,
  selectedId,
  onAddSource,
  onOpenBackground,
  onSelectLayer,
}: ToolboxSidebarProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('type', 'source')
  }

  return (
    <div className="w-44 shrink-0 bg-secondary-bg border-r border-white/8 flex flex-col py-4 px-3 overflow-y-auto">
      <p className="text-sm font-semibold text-white/55 uppercase tracking-widest mb-3 px-1">
        Toolbox
      </p>

      {/* Add Source */}
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onAddSource}
        className="flex flex-col items-center gap-1.5 px-2 py-4 rounded-lg border-2 border-dashed border-[#3031cb]/25 bg-[#3031cb]/8 text-[#3031cb]/80 text-base font-semibold cursor-pointer mb-2.5 transition-colors hover:bg-[#3031cb]/15 hover:border-[#3031cb]/45 select-none"
        title="Click or drag to canvas"
      >
        <Radio size={22} />
        Add Source
      </div>

      {/* Background */}
      <div
        onClick={onOpenBackground}
        className="flex flex-col items-center gap-1.5 px-2 py-4 rounded-lg border-2 border-dashed border-white/15 bg-white/4 text-white/50 text-base font-semibold cursor-pointer mb-5 transition-colors hover:bg-white/8 hover:border-white/25 hover:text-white/70 select-none"
        title="Set canvas background"
      >
        <ImageIcon size={22} />
        Background
      </div>

      {/* Layers */}
      <div className="border-t border-white/8 pt-4">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <Layers size={14} className="text-white/25" />
          <p className="text-sm font-semibold text-white/55 uppercase tracking-widest">
            Layers
          </p>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-white/20 text-center py-2.5">No sources</p>
        ) : (
          <div className="flex flex-col gap-1">
            {sources.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectLayer(s.id)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-sm transition-colors truncate',
                  s.id === selectedId
                    ? 'bg-white/8 text-white border border-white/15'
                    : 'text-white/45 hover:bg-white/5 hover:text-white/70 border border-transparent',
                )}
              >
                <Radio size={12} className="shrink-0" />
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
