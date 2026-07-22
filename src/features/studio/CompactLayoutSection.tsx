import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SourceSlotRow } from './SourceSlotRow'
import { useStudioCtx } from './StudioContext'
import { uid } from './useStudio'
import { MAX_SOURCE_SLOTS, MAX_TYPE_SOURCE_SLOTS } from '../../types/studio'
import type { SourceType } from '../../types/studio'

interface CompactLayoutSectionProps {
  previewRowIdx: number | null
}

export function CompactLayoutSection({ previewRowIdx }: CompactLayoutSectionProps) {
  const {
    rows, groupLayouts, layoutData, onCaptionChange,
    addSource, removeSource, updateSource, muteSource, setSourceVolume, setSourceTransform, updateRow,
    participants, virtualSources, rtmpSources, videoAssets,
    isLoadingVideoAssets, openVideoPopup, showToast, activeRowIdx,
  } = useStudioCtx()

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null)
  const [reorderOverIdx, setReorderOverIdx] = useState<number | null>(null)
  const [replaceOverIdx, setReplaceOverIdx] = useState<number | null>(null)

  const previewRow = previewRowIdx !== null ? rows[previewRowIdx] : null
  const selectedLayout = previewRow?.captionId
    ? layoutData.find(l => String(l.id) === previewRow.captionId)
    : null
  const maxSlots = selectedLayout
    ? Math.min(Math.max(1, selectedLayout.windowsCount), MAX_SOURCE_SLOTS)
    : 0

  const isActive = previewRowIdx === activeRowIdx
  const reorderType = `x-slot-reorder-compact-${previewRowIdx}`

  function isReorderDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.includes(reorderType)
  }

  function isSidebarDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.includes('text/plain') && !e.dataTransfer.types.some(t => t.startsWith('x-slot-reorder-'))
  }

  function countSourcesByType(sourceType: SourceType): number {
    return (previewRow?.sources ?? []).filter(s => s.sourceType === sourceType).length
  }

  function getDisabledTypesForSlot(slotIdx: number): SourceType[] {
    if (!previewRow) return []
    const siblingTypes = previewRow.sources.filter((_, i) => i !== slotIdx).map(s => s.sourceType)
    const disabled: SourceType[] = []
    if (siblingTypes.filter(t => t === 'vod').length >= MAX_TYPE_SOURCE_SLOTS) disabled.push('vod')
    if (siblingTypes.filter(t => t === 'rtmp').length >= MAX_TYPE_SOURCE_SLOTS) disabled.push('rtmp')
    return disabled
  }

  function handleSlotReorder(dropIdx: number) {
    if (previewRowIdx === null || reorderDragIdx === null || reorderDragIdx === dropIdx) return
    const newSources = [...(previewRow?.sources ?? [])]
    const [draggedSlot] = newSources.splice(reorderDragIdx, 1)
    newSources.splice(dropIdx, 0, draggedSlot)
    updateRow(previewRowIdx, { sources: newSources })
    setReorderDragIdx(null)
    setReorderOverIdx(null)
  }

  function handleContainerDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    if (isReorderDrag(e) || previewRowIdx === null) return
    const sourceValue = e.dataTransfer.getData('text/plain')
    if (!sourceValue) return
    if (!selectedLayout) {
      showToast('No layout selected', 'Select a layout before adding sources.')
      return
    }
    if ((previewRow?.sources.length ?? 0) >= maxSlots) {
      showToast('Row is full', `This layout supports a maximum of ${maxSlots} source${maxSlots === 1 ? '' : 's'}.`)
      return
    }
    const dtype = e.dataTransfer.getData('dtype')
    const sourceType: SourceType = dtype === 'video' ? 'vod' : (e.dataTransfer.getData('sourceType') as SourceType) || 'webrtc'
    if ((sourceType === 'vod' || sourceType === 'rtmp') && countSourcesByType(sourceType) >= MAX_TYPE_SOURCE_SLOTS) {
      showToast('Source limit reached', `A maximum of ${MAX_TYPE_SOURCE_SLOTS} ${sourceType.toUpperCase()} sources are allowed per row.`)
      return
    }
    if (previewRow?.sources.some(s => s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already added', 'This source is already in this row.')
      return
    }
    updateRow(previewRowIdx, {
      sources: [...(previewRow?.sources ?? []), { slotKey: uid(), sourceType, sourceValue, muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: false }],
    })
  }

  function handleSlotReplace(slotIdx: number, e: React.DragEvent) {
    if (previewRowIdx === null) return
    const sourceValue = e.dataTransfer.getData('text/plain')
    if (!sourceValue) return
    const dtype = e.dataTransfer.getData('dtype')
    const sourceType: SourceType = dtype === 'video' ? 'vod' : (e.dataTransfer.getData('sourceType') as SourceType) || 'webrtc'
    const currentSlot = previewRow?.sources[slotIdx]
    if (currentSlot?.sourceType === sourceType && currentSlot?.sourceValue === sourceValue) return
    if (previewRow?.sources.some((s, i) => i !== slotIdx && s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already added', 'This source is already in this row.')
      return
    }
    if (sourceType === 'vod' || sourceType === 'rtmp') {
      const siblingCount = (previewRow?.sources ?? []).filter((s, i) => i !== slotIdx && s.sourceType === sourceType).length
      if (siblingCount >= MAX_TYPE_SOURCE_SLOTS) {
        showToast('Source limit reached', `A maximum of ${MAX_TYPE_SOURCE_SLOTS} ${sourceType.toUpperCase()} sources are allowed per row.`)
        return
      }
    }
    updateSource(previewRowIdx, slotIdx, { sourceType, sourceValue, muted: currentSlot?.muted ?? false })
  }

  if (previewRowIdx === null) {
    return (
      <div id="compact-layout-section" className="flex-1 min-h-0 flex items-center justify-center">
        <p className="text-[11px] text-secondary-text">Select a row from the preview bus</p>
      </div>
    )
  }

  return (
    <div id="compact-layout-section" className="flex-1 min-h-0 flex flex-col gap-2 px-3 pb-2 overflow-y-auto">
      {/* Layout picker */}
      <div id="compact-layout-picker" className="shrink-0 flex flex-col gap-1">
        <span className="text-[8px] text-secondary-text uppercase tracking-widest">Layout</span>
        <div id="compact-layout-picker-buttons" className="flex flex-wrap gap-1">
          {groupLayouts.length === 0 ? (
            <span className="text-[10px] text-secondary-text italic">No layouts — refresh group</span>
          ) : (
            groupLayouts.map(layout => (
              <button
                key={layout.id}
                id={`compact-btn-layout-${layout.id}`}
                type="button"
                onClick={() => onCaptionChange(previewRowIdx, String(layout.id))}
                className={cn(
                  'px-2.5 py-1 rounded border text-[10px] font-medium cursor-pointer transition-colors',
                  previewRow?.captionId === String(layout.id)
                    ? 'bg-[#3031cb]/15 border-[#3031cb]/40 text-primary-text'
                    : 'bg-surface border-primary-border text-secondary-text hover:border-[#3031cb]/30 hover:text-primary-text',
                )}
              >
                {layout.caption} (W:{layout.windowsCount})
              </button>
            ))
          )}
        </div>
      </div>

      {/* Source slots */}
      <div id="compact-source-slots" className="shrink-0 flex flex-col gap-1.5">
        <span className="text-[8px] text-secondary-text uppercase tracking-widest">Sources — Q{previewRowIdx + 1}</span>

        <div
          id={`compact-source-slots-drop-zone-${previewRowIdx}`}
          className={cn(
            'flex flex-col gap-1.5 min-h-6 rounded transition-colors',
            isDraggingOver && 'outline outline-[#3031cb]/40 bg-[#3031cb]/4',
          )}
          onDragOver={e => { e.preventDefault(); if (isSidebarDrag(e)) setIsDraggingOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false) }}
          onDrop={handleContainerDrop}
        >
          {previewRow?.sources.map((slot, slotIdx) => {
            const usedValues = previewRow.sources
              .filter((s, i) => i !== slotIdx && s.sourceType === slot.sourceType)
              .map(s => s.sourceValue)
              .filter(Boolean)

            return (
              <div
                id={`compact-slot-drag-${previewRowIdx}-${slotIdx}`}
                key={slot.slotKey ?? slotIdx}
                draggable={previewRow.sources.length > 1}
                onDragStart={e => {
                  setReorderDragIdx(slotIdx)
                  e.dataTransfer.setData(reorderType, String(slotIdx))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); setReplaceOverIdx(null) }}
                onDragOver={e => {
                  if (isReorderDrag(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setReorderOverIdx(slotIdx)
                  } else if (isSidebarDrag(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setReplaceOverIdx(slotIdx)
                    setIsDraggingOver(false)
                  }
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setReorderOverIdx(null)
                    setReplaceOverIdx(null)
                  }
                }}
                onDrop={e => {
                  if (isReorderDrag(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSlotReorder(slotIdx)
                  } else if (isSidebarDrag(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDraggingOver(false)
                    setReplaceOverIdx(null)
                    handleSlotReplace(slotIdx, e)
                  }
                }}
                className={cn(
                  'relative rounded transition-all',
                  reorderDragIdx === slotIdx && 'opacity-30',
                  reorderOverIdx === slotIdx && reorderDragIdx !== slotIdx && 'border-t-2 border-[#3031cb]',
                  replaceOverIdx === slotIdx && 'outline outline-[#3031cb]/60 bg-[#3031cb]/6',
                )}
              >
                <SourceSlotRow
                  rowIdx={previewRowIdx}
                  slotIdx={slotIdx}
                  slot={slot}
                  participants={participants}
                  virtualSources={virtualSources}
                  rtmpSources={rtmpSources}
                  videoAssets={videoAssets}
                  usedValues={usedValues}
                  disabledTypes={getDisabledTypesForSlot(slotIdx)}
                  isLoadingVideoAssets={isLoadingVideoAssets}
                  onUpdate={patch => {
                    if ('muted' in patch && !('sourceType' in patch)) {
                      muteSource(previewRowIdx, slotIdx, !!patch.muted)
                    } else {
                      updateSource(previewRowIdx, slotIdx, 'sourceType' in patch ? { ...patch, muted: slot.muted } : patch)
                    }
                  }}
                  onVolumeChange={volume => setSourceVolume(previewRowIdx, slotIdx, volume)}
                  onTransformChange={patch => setSourceTransform(previewRowIdx, slotIdx, patch)}
                  onRemove={() => removeSource(previewRowIdx, slotIdx)}
                  openVideoPopup={openVideoPopup}
                  onShowToast={(title, description) => showToast(title, description)}
                  isActive={isActive}
                  isDragging={reorderDragIdx === slotIdx}
                  isDragDisabled={previewRow.sources.length <= 1}
                />
              </div>
            )
          })}

          {/* End-of-list drop zone for drag-to-end reorder */}
          {reorderDragIdx !== null && (
            <div
              id={`compact-slot-drop-end-${previewRowIdx}`}
              onDragOver={e => {
                if (isReorderDrag(e)) {
                  e.preventDefault()
                  e.stopPropagation()
                  setReorderOverIdx(previewRow?.sources.length ?? 0)
                }
              }}
              onDragLeave={() => setReorderOverIdx(null)}
              onDrop={e => {
                if (isReorderDrag(e)) {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSlotReorder(previewRow?.sources.length ?? 0)
                }
              }}
              className={cn(
                'h-1.5 rounded transition-all',
                reorderOverIdx === (previewRow?.sources.length ?? 0) && 'border-b-2 border-[#3031cb]',
              )}
            />
          )}

          {/* Empty state */}
          {(previewRow?.sources.length ?? 0) === 0 && (
            <span className="text-[10px] text-secondary-text italic px-1 py-0.5">
              {selectedLayout ? 'Drag a source or click Add Source' : 'Select a layout first'}
            </span>
          )}

          {/* Add slot */}
          {(previewRow?.sources.length ?? 0) < maxSlots && (
            <button
              id={`compact-btn-add-slot-${previewRowIdx}`}
              type="button"
              onClick={() => addSource(previewRowIdx)}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (isSidebarDrag(e)) setIsDraggingOver(true) }}
              onDrop={e => { e.stopPropagation(); handleContainerDrop(e) }}
              className="self-start flex items-center gap-1 px-2 py-1 rounded border border-dashed border-primary-border text-secondary-text hover:border-active-accent/30 hover:text-primary-text text-[10px] cursor-pointer transition-colors"
            >
              <Plus size={10} /> Add Source
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
