import { memo } from 'react'
import { ArrowRightCircle, Eye, Radio } from 'lucide-react'
import { useStudioCtx } from './StudioContext'

interface CompactMonitorRowProps {
  onTake: () => void
}

export const CompactMonitorRow = memo(function CompactMonitorRow({ onTake }: CompactMonitorRowProps) {
  const { previewUrl, masterUrl } = useStudioCtx()

  return (
    <div id="compact-monitor-row" className="shrink-0 flex items-stretch gap-2 px-3 pt-2.5 pb-2">
      {/* Preview monitor */}
      <div id="compact-monitor-preview" className="flex-1 flex flex-col gap-1">
        <div id="compact-monitor-preview-label" className="flex items-center justify-center gap-1.5 py-0.5 rounded-md bg-white/3 border border-white/8">
          <Eye size={9} className="text-white/40" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Preview</span>
        </div>
        <iframe
          id="compact-iframe-preview"
          title="Preview feed"
          src={previewUrl}
          className="w-full rounded-lg border border-white/10 bg-[#040810]"
          style={{ aspectRatio: '16/9' }}
          allowFullScreen
        />
      </div>

      {/* TAKE column */}
      <div id="compact-take-column" className="flex flex-col gap-1 w-9 shrink-0">
        {/* Invisible spacer to align with monitor label row */}
        <div className="flex items-center justify-center py-1 invisible" aria-hidden="true">
          <span className="text-[10px]">.</span>
        </div>
        <div id="compact-take-btn-wrapper" className="flex-1 flex items-center justify-center">
          <button
            id="compact-btn-take"
            type="button"
            onClick={onTake}
            title="Go live"
            className="flex flex-col items-center justify-center gap-1.5 py-4 px-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all w-full cursor-pointer bg-linear-to-b from-[#3031cb] to-[#a00812] text-white shadow-[0_0_12px_rgba(48,49,203,0.25)] hover:shadow-[0_0_20px_rgba(48,49,203,0.45)] hover:scale-105 active:scale-95"
          >
            <ArrowRightCircle size={12} />
            <span style={{ writingMode: 'vertical-lr' }}>TAKE</span>
          </button>
        </div>
      </div>

      {/* Master monitor */}
      <div id="compact-monitor-master" className="flex-1 flex flex-col gap-1">
        <div id="compact-monitor-master-label" className="flex items-center justify-center gap-1.5 py-0.5 rounded-md bg-[#3031cb]/8 border border-[#3031cb]/20">
          <Radio size={9} className="text-[#3031cb]" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#3031cb]">On Air — Master</span>
        </div>
        <iframe
          id="compact-iframe-master"
          title="Master feed"
          src={masterUrl}
          className="w-full rounded-lg border border-[#3031cb]/20 bg-[#040810]"
          style={{ aspectRatio: '16/9' }}
          allowFullScreen
        />
      </div>
    </div>
  )
})
