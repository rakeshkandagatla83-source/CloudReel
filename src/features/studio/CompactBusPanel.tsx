import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { LayoutEntry } from '../../types/studio'

interface LayoutWindow {
  x: number
  y: number
  width: number
  height: number
}

function parseLayoutWindows(entry: LayoutEntry): LayoutWindow[] {
  try {
    const list = (JSON.parse(entry.pubnubMsg).MixLayoutList ?? []) as Array<{
      LocationX: number
      LocationY: number
      ImageWidth: number
      ImageHeight: number
    }>
    return list.map(item => ({
      x: item.LocationX,
      y: item.LocationY,
      width: item.ImageWidth,
      height: item.ImageHeight,
    }))
  } catch {
    return []
  }
}

function LayoutThumbnail({ entry }: { entry: LayoutEntry }) {
  const windows = useMemo(() => parseLayoutWindows(entry), [entry])
  return (
    <svg
      id={`compact-layout-thumb-svg-${entry.id}`}
      viewBox="0 0 1920 1080"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width="1920" height="1080" fill="#060b14" />
      {windows.map((win, windowIdx) => (
        <rect
          key={windowIdx}
          x={win.x + 8}
          y={win.y + 8}
          width={win.width - 16}
          height={win.height - 16}
          fill="#1a2a44"
          stroke="#2a3f66"
          strokeWidth="14"
          rx="20"
        />
      ))}
    </svg>
  )
}

interface LayoutCardProps {
  entry: LayoutEntry
  isActive: boolean
  isDisabled: boolean
  isStaleBlocked: boolean
  busType: 'preview' | 'master'
  onClick: (layoutId: string) => void
}

function LayoutCard({ entry, isActive, isDisabled, isStaleBlocked, busType, onClick }: LayoutCardProps) {
  const activePreviewCls = 'border-emerald-500/60 shadow-[0_0_8px_rgba(52,211,153,0.25)]'
  const activeMasterCls = 'border-[#3031cb]/60 shadow-[0_0_8px_rgba(48,49,203,0.25)]'
  const inactivePreviewHoverCls = 'border-white/10 hover:border-emerald-500/35'
  const inactiveMasterHoverCls = 'border-white/10 hover:border-[#3031cb]/35'

  const activeThumbnailBg = busType === 'preview' ? 'bg-emerald-950/40' : 'bg-[#3031cb]/8'
  const activeLabelCls = busType === 'preview' ? 'text-emerald-400' : 'text-[#3031cb]'

  const tooltipText = isStaleBlocked
    ? 'A selected source left the meeting - remove or replace it before firing'
    : isDisabled
      ? isActive
        ? `Active layout — select ${entry.windowsCount} source${entry.windowsCount === 1 ? '' : 's'} to change`
        : `Select ${entry.windowsCount} source${entry.windowsCount === 1 ? '' : 's'} to use this layout`
      : `${entry.caption} (${entry.windowsCount}W) → ${busType === 'preview' ? 'Preview' : 'Master'}`

  return (
    <button
      id={`compact-${busType}-layout-btn-${entry.id}`}
      type="button"
      disabled={isDisabled}
      onClick={() => onClick(String(entry.id))}
      title={tooltipText}
      className={cn(
        'shrink-0 flex flex-col rounded-md border transition-all overflow-hidden',
        isDisabled
          ? cn(
              'cursor-not-allowed',
              isActive
                ? busType === 'preview' ? activePreviewCls : activeMasterCls
                : 'border-white/5 opacity-25',
            )
          : cn(
              'cursor-pointer active:scale-95',
              isActive
                ? busType === 'preview' ? activePreviewCls : activeMasterCls
                : busType === 'preview' ? inactivePreviewHoverCls : inactiveMasterHoverCls,
            ),
      )}
      style={{ width: 68 }}
    >
      <div
        id={`compact-${busType}-layout-thumb-${entry.id}`}
        className={cn(
          'w-full overflow-hidden',
          isActive ? activeThumbnailBg : 'bg-[#040810]',
        )}
        style={{ aspectRatio: '16/9' }}
      >
        <LayoutThumbnail entry={entry} />
      </div>
      <div
        id={`compact-${busType}-layout-label-${entry.id}`}
        className="px-1 py-0.5 w-full"
      >
        <span className={cn(
          'block text-[7px] font-medium leading-none truncate text-center',
          isActive ? activeLabelCls : isDisabled ? 'text-white/20' : 'text-white/40',
        )}>
          {entry.caption}
        </span>
      </div>
    </button>
  )
}

interface ScrollableBusRowProps {
  busType: 'preview' | 'master'
  layouts: LayoutEntry[]
  activeLayoutId: string | null
  selectedCount: number
  hasStaleSelection: boolean
  onLayoutClick: (layoutId: string) => void
}

function ScrollableBusRow({
  busType, layouts, activeLayoutId, selectedCount, hasStaleSelection, onLayoutClick,
}: ScrollableBusRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 4)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows)
    const resizeObserver = new ResizeObserver(updateArrows)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      resizeObserver.disconnect()
    }
  }, [updateArrows, layouts])

  function scrollCards(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const busLabel = busType === 'master' ? 'Master Bus' : 'Preview Bus'
  const busLabelCls = busType === 'master' ? 'text-[#3031cb]/70' : 'text-emerald-500/60'
  const arrowCls = busType === 'master'
    ? 'bg-[#3031cb]/10 border-[#3031cb]/20 text-[#3031cb] hover:bg-[#3031cb]/25'
    : 'bg-emerald-950/60 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/60'

  return (
    <div id={`compact-${busType}-bus`} className="flex flex-col gap-1">
      <span
        id={`compact-${busType}-bus-label`}
        className={cn('text-[8px] uppercase tracking-widest font-medium shrink-0', busLabelCls)}
      >
        {busLabel}
      </span>

      {layouts.length === 0 ? (
        <p id={`compact-${busType}-bus-empty`} className="text-[9px] text-white/20 italic py-1">
          No layouts — select a group first
        </p>
      ) : (
        <div id={`compact-${busType}-bus-scroll-wrap`} className="relative">
          {/* Left gradient + arrow */}
          {showLeftArrow && (
            <>
              <div
                id={`compact-${busType}-bus-gradient-left`}
                className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-linear-to-r from-[#060b14] to-transparent pointer-events-none"
              />
              <button
                id={`compact-${busType}-bus-btn-scroll-left`}
                type="button"
                onClick={() => scrollCards(-200)}
                className={cn(
                  'absolute left-0.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 flex items-center justify-center rounded-full border cursor-pointer transition-colors',
                  arrowCls,
                )}
              >
                <ChevronLeft size={10} />
              </button>
            </>
          )}

          {/* Scrollable layout cards */}
          <div
            id={`compact-${busType}-bus-layouts`}
            ref={scrollRef}
            className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {layouts.map(layout => (
              <LayoutCard
                key={layout.id}
                entry={layout}
                isActive={activeLayoutId !== null && String(layout.id) === String(activeLayoutId)}
                isDisabled={selectedCount === 0 || layout.windowsCount !== selectedCount || hasStaleSelection}
                isStaleBlocked={hasStaleSelection && selectedCount > 0 && layout.windowsCount === selectedCount}
                busType={busType}
                onClick={onLayoutClick}
              />
            ))}
          </div>

          {/* Right gradient + arrow */}
          {showRightArrow && (
            <>
              <div
                id={`compact-${busType}-bus-gradient-right`}
                className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-linear-to-l from-[#060b14] to-transparent pointer-events-none"
              />
              <button
                id={`compact-${busType}-bus-btn-scroll-right`}
                type="button"
                onClick={() => scrollCards(200)}
                className={cn(
                  'absolute right-0.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 flex items-center justify-center rounded-full border cursor-pointer transition-colors',
                  arrowCls,
                )}
              >
                <ChevronRight size={10} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface CompactBusPanelProps {
  allLayouts: LayoutEntry[]
  activePreviewLayoutId: string | null
  activeMasterLayoutId: string | null
  onPreviewLayoutClick: (layoutId: string) => void
  onMasterLayoutClick: (layoutId: string) => void
  selectedCount: number
  hasStaleSelection: boolean
}

export function CompactBusPanel({
  allLayouts,
  activePreviewLayoutId,
  activeMasterLayoutId,
  onPreviewLayoutClick,
  onMasterLayoutClick,
  selectedCount,
  hasStaleSelection,
}: CompactBusPanelProps) {
  return (
    <div id="compact-bus-panel" className="flex flex-col gap-3 px-3 pt-2 pb-5">
      <ScrollableBusRow
        busType="master"
        layouts={allLayouts}
        activeLayoutId={activeMasterLayoutId}
        selectedCount={selectedCount}
        hasStaleSelection={hasStaleSelection}
        onLayoutClick={onMasterLayoutClick}
      />
      <ScrollableBusRow
        busType="preview"
        layouts={allLayouts}
        activeLayoutId={activePreviewLayoutId}
        selectedCount={selectedCount}
        hasStaleSelection={hasStaleSelection}
        onLayoutClick={onPreviewLayoutClick}
      />
    </div>
  )
}
