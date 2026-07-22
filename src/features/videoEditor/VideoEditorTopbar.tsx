import { Film, Trash2, Scissors, Undo2 } from 'lucide-react'
import type { VideoEditorHook } from './useVideoEditor'
import type { AspectRatio } from './VideoEditorTypes'
import { AR_MAP } from './VideoEditorTypes'

const AR_OPTIONS = Object.keys(AR_MAP) as AspectRatio[]

interface Props {
  editor: VideoEditorHook
  onExport: () => void
  onExportJSON: () => void
  onRemoveVideoRequest: () => void
  onOpenVideoPicker: () => void
}

export function VideoEditorTopbar({ editor, onExport, onExportJSON, onRemoveVideoRequest, onOpenVideoPicker }: Props) {
  const { videoLoaded, markIn, markOut, aspectRatio, setAspectRatio, clearMarks } = editor

  const hasSelection = markIn != null && markOut != null

  return (
    <div id="ve-topbar" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#1e2d40] bg-[#0d1625] px-3 py-2">
      <span id="ve-topbar-title" className="text-sm font-bold text-white">
        PRO<span className="text-[#3031cb]">EDIT</span>
      </span>

      <div id="ve-topbar-sep-1" className="h-5 w-px bg-[#1e2d40]" />

      <button
        id="ve-btn-import-video"
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#3031cb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2626a8]"
        onClick={onOpenVideoPicker}
      >
        <Film size={13} />
        Import Video
      </button>

      <button
        id="ve-btn-clear-marks"
        disabled={!hasSelection}
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#1e2d40] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#253649] disabled:cursor-default disabled:opacity-40"
        onClick={clearMarks}
      >
        <Undo2 size={13} />
        Clear Marks
      </button>

      <button
        id="ve-btn-remove-video"
        disabled={!videoLoaded}
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#2d1010] px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-[#3d1515] disabled:cursor-default disabled:opacity-40"
        onClick={onRemoveVideoRequest}
      >
        <Trash2 size={13} />
        Remove Video
      </button>

      <div id="ve-topbar-sep-2" className="h-5 w-px bg-[#1e2d40]" />

      <button
        id="ve-btn-export-selection"
        disabled={!hasSelection}
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#3031cb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2626a8] disabled:cursor-default disabled:opacity-40"
        onClick={onExport}
      >
        <Scissors size={13} />
        Export Selection
      </button>

      <button
        id="ve-btn-export-json"
        className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#1e2d40] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#253649]"
        onClick={onExportJSON}
      >
        {'{ }'} Export JSON
      </button>

      <div id="ve-topbar-sep-3" className="h-5 w-px bg-[#1e2d40]" />

      <div id="ve-ar-group" className="flex items-center gap-1.5">
        <span id="ve-ar-label" className="text-xs text-slate-500">Ratio:</span>
        <div className="flex gap-1">
          {AR_OPTIONS.map(ar => (
            <button
              key={ar}
              id={`ve-btn-ar-${ar}`}
              onClick={() => setAspectRatio(ar)}
              className={`cursor-pointer rounded px-2 py-1 text-xs font-semibold transition-colors ${
                aspectRatio === ar
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-400'
                  : 'border border-[#1e2d40] bg-[#111c2d] text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {ar === 'free' ? 'Free' : ar}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
