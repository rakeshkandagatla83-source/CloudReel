import { Play, Pause, Volume2 } from 'lucide-react'
import type { VideoEditorHook } from './useVideoEditor'
import { fmtTimeFull, fmtTime } from './VideoEditorTypes'

interface Props {
  editor: VideoEditorHook
}

export function TransportBar({ editor }: Props) {
  const {
    videoLoaded,
    videoDuration,
    currentTime,
    playing,
    markIn,
    markOut,
    togglePlay,
    stepBy,
    setVolume,
    setMarkInPoint,
    setMarkOutPoint,
    clearMarks,
  } = editor

  const hasMarks = markIn != null && markOut != null

  return (
    <div id="ve-transport" className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#1e2d40] bg-[#0d1625] px-3 py-2">
      {/* Step + Play group */}
      <div id="ve-step-group" className="flex items-center gap-0.5 rounded-lg border border-[#1e2d40] bg-[#111c2d] px-1 py-1">
        {([-15, -5, -1] as const).map(s => (
          <button
            key={s}
            id={`ve-btn-step-${Math.abs(s)}-back`}
            disabled={!videoLoaded}
            onClick={() => stepBy(s)}
            className="cursor-pointer rounded px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-[#1e2d40] hover:text-white disabled:cursor-default disabled:opacity-40"
          >
            {s}s‹
          </button>
        ))}

        <button
          id="ve-btn-play-pause"
          disabled={!videoLoaded}
          onClick={togglePlay}
          className="mx-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#1e2d40] text-white hover:bg-[#253649] disabled:cursor-default disabled:opacity-40"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
        </button>

        {([1, 5, 15] as const).map(s => (
          <button
            key={s}
            id={`ve-btn-step-${s}-fwd`}
            disabled={!videoLoaded}
            onClick={() => stepBy(s)}
            className="cursor-pointer rounded px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-[#1e2d40] hover:text-white disabled:cursor-default disabled:opacity-40"
          >
            ›+{s}s
          </button>
        ))}
      </div>

      {/* Volume */}
      <div id="ve-volume-group" className="flex items-center gap-1.5">
        <Volume2 size={14} className="text-slate-500" />
        <input
          id="ve-volume"
          type="range"
          min={0}
          max={100}
          defaultValue={80}
          className="w-16 accent-blue-500"
          onChange={e => setVolume(+e.target.value)}
        />
      </div>

      {/* Mark buttons */}
      <div id="ve-marks-group" className="flex gap-1">
        <button
          id="ve-btn-mark-in"
          disabled={!videoLoaded}
          onClick={setMarkInPoint}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-default disabled:opacity-40"
          title="Mark In (I)"
        >
          ◁|
        </button>
        <button
          id="ve-btn-mark-out"
          disabled={!videoLoaded}
          onClick={setMarkOutPoint}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-default disabled:opacity-40"
          title="Mark Out (O)"
        >
          |▷
        </button>
        <button
          id="ve-btn-clear-marks-transport"
          disabled={!hasMarks}
          onClick={clearMarks}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[#1e2d40] text-xs font-bold text-slate-300 hover:bg-[#253649] disabled:cursor-default disabled:opacity-40"
          title="Clear Marks"
        >
          ↺
        </button>
      </div>

      {/* Timecode display */}
      <div id="ve-timecode" className="ml-auto flex items-center gap-1 font-mono text-xs text-slate-500">
        <strong id="ve-timecode-current" className="text-white">{fmtTimeFull(currentTime)}</strong>
        <span>/</span>
        <span id="ve-timecode-total">{fmtTimeFull(videoDuration)}</span>
        <span className="mx-1 text-slate-700">|</span>
        <span>In:</span>
        <strong id="ve-timecode-in" className="text-blue-400">{markIn != null ? fmtTime(markIn) : '--:--'}</strong>
        <span className="ml-1">Out:</span>
        <strong id="ve-timecode-out" className="text-blue-400">{markOut != null ? fmtTime(markOut) : '--:--'}</strong>
      </div>
    </div>
  )
}
