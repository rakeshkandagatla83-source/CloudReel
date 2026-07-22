import { Trash2, Type, Image, ChevronUp, ChevronDown, Music } from 'lucide-react'
import type { Overlay } from './VideoEditorTypes'
import { fmtTime } from './VideoEditorTypes'

interface Props {
  overlays: Overlay[]
  selectedId: number | null
  onSelect: (id: number) => void
  onRemove: (id: number) => void
  onMoveUp: (id: number) => void
  onMoveDown: (id: number) => void
  onAddLogo: () => void
  onAddText: () => void
  onAddAudio: () => void
}

export function OverlayList({ overlays, selectedId, onSelect, onRemove, onMoveUp, onMoveDown, onAddLogo, onAddText, onAddAudio }: Props) {
  const total = overlays.length

  return (
    <div id="ve-overlay-list" className="flex flex-1 flex-col overflow-hidden">
      <div id="ve-overlay-scroll" className="flex-1 overflow-y-auto p-2">
        {total === 0 ? (
          <p id="ve-overlay-empty" className="py-8 text-center text-xs text-slate-600">
            Add a logo, text, or audio.<br /><br />
            Drag items on the preview to position.
          </p>
        ) : (
          // Render in reverse so top layer appears first in the list
          <div id="ve-overlays-container" className="flex flex-col gap-1.5">
            {[...overlays].reverse().map((ov, reversedIdx) => {
              const layerIndex = total - 1 - reversedIdx // 0-based, 0 = bottom
              const isTop = layerIndex === total - 1
              const isBottom = layerIndex === 0

              return (
                <div
                  key={ov.id}
                  id={`ve-overlay-item-${ov.id}`}
                  onClick={() => onSelect(ov.id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                    selectedId === ov.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#1e2d40] bg-[#111c2d] hover:border-slate-600'
                  }`}
                >
                  {/* Z-order controls */}
                  <div id={`ve-ov-z-controls-${ov.id}`} className="flex shrink-0 flex-col gap-px" onClick={e => e.stopPropagation()}>
                    <button
                      id={`ve-btn-ov-up-${ov.id}`}
                      disabled={isTop}
                      onClick={() => onMoveUp(ov.id)}
                      className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-slate-600 hover:bg-[#1e2d40] hover:text-slate-300 disabled:cursor-default disabled:opacity-25"
                      title="Move layer up"
                    >
                      <ChevronUp size={10} />
                    </button>
                    <button
                      id={`ve-btn-ov-down-${ov.id}`}
                      disabled={isBottom}
                      onClick={() => onMoveDown(ov.id)}
                      className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-slate-600 hover:bg-[#1e2d40] hover:text-slate-300 disabled:cursor-default disabled:opacity-25"
                      title="Move layer down"
                    >
                      <ChevronDown size={10} />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div id={`ve-ov-thumb-${ov.id}`} className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-primary-bg">
                    {ov.type === 'image' ? (
                      <img src={(ov as { url: string }).url} className="h-full w-full object-contain" alt="" />
                    ) : (
                      <Type size={11} className="text-violet-400" />
                    )}
                  </div>

                  {/* Name + time */}
                  <div id={`ve-ov-info-${ov.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-300">{ov.name}</p>
                    <p className="text-[10px] text-slate-600">
                      {fmtTime(ov.showFrom)} → {fmtTime(ov.showTo)}
                    </p>
                  </div>

                  {/* Layer badge */}
                  <span id={`ve-ov-badge-${ov.id}`} className="shrink-0 rounded bg-[#1e2d40] px-1 py-px text-[9px] font-semibold text-slate-500">
                    L{layerIndex + 1}
                  </span>

                  {/* Delete */}
                  <button
                    id={`ve-btn-ov-delete-${ov.id}`}
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-[#3d1515] bg-[#2d1010] text-red-400 hover:bg-[#3d1515]"
                    onClick={e => { e.stopPropagation(); onRemove(ov.id) }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div id="ve-add-buttons" className="flex gap-1.5 border-t border-[#1e2d40] p-2">
        <button
          id="ve-btn-add-logo"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded bg-green-700 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
          onClick={onAddLogo}
        >
          <Image size={11} />
          Logo
        </button>
        <button
          id="ve-btn-add-text"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded bg-violet-700 py-1.5 text-xs font-semibold text-white hover:bg-violet-600"
          onClick={onAddText}
        >
          <Type size={11} />
          Text
        </button>
        <button
          id="ve-btn-add-audio"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded bg-[#1e2d40] py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#253649]"
          onClick={onAddAudio}
        >
          <Music size={11} />
          Audio
        </button>
      </div>
    </div>
  )
}
