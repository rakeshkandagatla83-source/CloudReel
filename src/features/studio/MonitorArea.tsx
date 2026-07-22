import { memo, useEffect, useState } from 'react'
import { ArrowRightCircle, Circle, Eye, Radio, Square } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'

export const MonitorArea = memo(function MonitorArea() {
  const { previewUrl, masterUrl, mode, publishToMaster, isRecording, isRecordingBusy, toggleRecording } = useStudioCtx()
  const isMasterOnly = mode === 'master'

  const [isVertical, setIsVertical] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setIsVertical(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={cn(
      'flex items-stretch gap-2 mb-2.5',
      isVertical ? 'flex-col' : 'flex-row',
      isMasterOnly && 'justify-center'
    )}>
      {/* Preview */}
      {!isMasterOnly && (
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface border border-primary-border">
            <Eye size={12} className="text-secondary-text" />
            <span className="text-xs xl:text-[10px] font-semibold uppercase tracking-wider text-secondary-text">Preview</span>
          </div>
          <iframe
            id="studio-iframe-preview"
            title="Preview feed"
            src={previewUrl}
            className="w-full rounded-lg border border-primary-border bg-surface-2"
            style={{ aspectRatio: '16/9' }}
            allowFullScreen
          />
        </div>
      )}

      {/* Publish button */}
      {!isMasterOnly && (
        <div className={cn(
          'flex gap-1 shrink-0 justify-center',
          isVertical ? 'flex-row w-full my-1' : 'flex-col w-10'
        )}>
          {/* Spacer matching label row height on desktop, hidden on mobile/tablet */}
          {!isVertical && (
            <div className="flex items-center justify-center py-1 invisible" aria-hidden="true">
              <span className="text-[10px] font-semibold uppercase tracking-wider">.</span>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center w-full">
            <button
              id="studio-btn-publish-to-master"
              type="button"
              onClick={publishToMaster}
              title="Publish to Master"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg bg-linear-to-b from-[#3031cb] to-[#a00812] text-white font-bold cursor-pointer shadow-[0_0_12px_rgba(48,49,203,0.25)] hover:shadow-[0_0_20px_rgba(48,49,203,0.45)] hover:scale-102 transition-all w-full",
                isVertical
                  ? "flex-row py-2.5 px-4 text-sm h-11"
                  : "flex-col py-4 px-1.5 text-[9px] uppercase tracking-widest"
              )}
            >
              <ArrowRightCircle size={14} className={cn(isVertical && 'rotate-90')} />
              <span style={!isVertical ? { writingMode: 'vertical-lr' } : undefined}>PUBLISH</span>
            </button>
          </div>
        </div>
      )}

      {/* Master */}
      <div className={cn(
        isMasterOnly ? (isVertical ? 'w-full' : 'w-1/2') : 'flex-1',
        'flex flex-col gap-1'
      )}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-active-accent/5 border border-active-accent/20">
            <Radio size={12} className="text-active-accent" />
            <span className="text-xs xl:text-[10px] font-semibold uppercase tracking-wider text-active-accent">On Air — Master</span>
          </div>
          <button
            id="studio-btn-toggle-recording"
            type="button"
            onClick={() => { void toggleRecording() }}
            disabled={isRecordingBusy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs xl:text-[10px] font-medium cursor-pointer transition-colors border shrink-0 disabled:opacity-50 disabled:cursor-not-allowed min-h-8 xl:min-h-0',
              isRecording
                ? 'border-active-accent/40 bg-active-accent/15 text-active-accent hover:bg-active-accent/25'
                : 'border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2'
            )}
          >
            {isRecordingBusy
              ? <><Circle size={10} className="text-secondary-text animate-spin" /> {isRecording ? 'Stopping…' : 'Starting…'}</>
              : isRecording
                ? <><Circle size={10} className="fill-active-accent text-active-accent animate-pulse" /> Recording</>
                : <><Square size={10} className="fill-current" /> Record</>}
          </button>
        </div>
        <iframe
          id="studio-iframe-master"
          title="Master feed"
          src={masterUrl}
          className="w-full rounded-lg border border-active-accent/20 bg-surface-2"
          style={{ aspectRatio: '16/9' }}
          allowFullScreen
        />
      </div>
    </div>
  )
})
