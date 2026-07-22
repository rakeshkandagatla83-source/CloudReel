import { Trash2, Play } from 'lucide-react'
import type { AudioTrack } from './VideoEditorTypes'
import { fmtTimeFull, fmtTime } from './VideoEditorTypes'

interface Props {
  track: AudioTrack
  duration: number
  audioEl: HTMLAudioElement | undefined
  onChange: (patch: Partial<AudioTrack>) => void
  onRemove: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="w-14 shrink-0 text-[10px] text-slate-500">{label}</span>
      <div className="flex flex-1 items-center gap-1.5 min-w-0">{children}</div>
    </div>
  )
}

export function AudioProperties({ track, duration, audioEl, onChange, onRemove }: Props) {
  const previewAudio = () => {
    if (!audioEl) return
    audioEl.currentTime = 0
    audioEl.volume = track.volume / 100
    audioEl.play().catch(() => {})
    setTimeout(() => audioEl.pause(), 3000)
  }

  return (
    <div id="ve-audio-props" className="flex flex-1 flex-col overflow-y-auto p-2 text-xs">
      {/* Header */}
      <div id="ve-audio-props-header" className="flex items-center gap-2 mb-3">
        <span className="text-xl">♪</span>
        <div>
          <p className="text-xs font-semibold text-white">{track.name}</p>
          <p className="text-[10px] text-slate-600">{fmtTimeFull(track.duration)}</p>
        </div>
      </div>

      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Timing</p>
      <Row label="Start at">
        <input
          id="ve-audio-start"
          type="text"
          defaultValue={fmtTime(track.startTime)}
          key={fmtTime(track.startTime)}
          className="w-16 rounded border border-[#1e2d40] bg-primary-bg px-1.5 py-0.5 text-[10px] text-slate-300 outline-hidden focus:border-blue-500"
          onBlur={e => {
            const parts = e.target.value.split(':')
            let s = 0
            if (parts.length === 2) s = parseInt(parts[0]) * 60 + parseFloat(parts[1])
            onChange({ startTime: Math.max(0, Math.min(duration, s)) })
          }}
        />
      </Row>

      <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Volume</p>
      <Row label="Volume">
        <input
          id="ve-audio-volume"
          type="range"
          min={0}
          max={100}
          value={track.volume}
          className="h-1 flex-1 accent-blue-500"
          onChange={e => onChange({ volume: +e.target.value })}
        />
        <span className="w-8 shrink-0 text-right text-[10px] text-slate-500">{track.volume}%</span>
      </Row>
      <Row label="">
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-400">
          <input
            id="ve-audio-mute"
            type="checkbox"
            checked={track.muted}
            onChange={e => onChange({ muted: e.target.checked })}
          />
          Mute track
        </label>
      </Row>

      <div className="mt-4 flex gap-2">
        <button
          id="ve-btn-audio-preview"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded bg-[#1e2d40] py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#253649]"
          onClick={previewAudio}
        >
          <Play size={11} />
          Preview
        </button>
        <button
          id="ve-btn-audio-remove"
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded bg-[#2d1010] py-1.5 text-xs font-semibold text-red-400 hover:bg-[#3d1515]"
          onClick={onRemove}
        >
          <Trash2 size={11} />
          Remove
        </button>
      </div>
    </div>
  )
}
