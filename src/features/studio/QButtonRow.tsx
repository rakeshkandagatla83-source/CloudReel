import { useState } from 'react'
import { cn } from '../../lib/utils'
import { AlertTriangle, Plus } from 'lucide-react'
import { GfxMultiSelect } from './GfxMultiSelect'
import { Select, SelectItem } from '../../components/ui/Select'
import { SourceSlotRow } from './SourceSlotRow'
import { useStudioCtx } from './StudioContext'
import { uid } from './useStudio'
import { MAX_SOURCE_SLOTS, MAX_TYPE_SOURCE_SLOTS } from '../../types/studio'
import type { RowState, SourceType } from '../../types/studio'

interface Props {
  idx: number
  row: RowState
  isActive: boolean
  isNext: boolean
}

const isOdd = (q: number) => q % 2 !== 0

export function QButtonRow({ idx, row, isActive, isNext }: Props) {
  const { participants, rtmpSources, webrtcSources, groupLayouts, selectedGroup, layoutData, fire, updateRow, addSource, removeSource, updateSource, muteSource, setSourceVolume, setSourceTransform, onCaptionChange, gfxData, gfxTemplateName, videoAssets, isLoadingVideoAssets, openVideoPopup, showToast, virtualSources } = useStudioCtx()
  const q = idx + 1
  const odd = isOdd(q)
  const entry = layoutData.find(l => String(l.id) === row.captionId)
  const maxSlots = entry ? Math.min(Math.max(1, entry.windowsCount), MAX_SOURCE_SLOTS) : 0
  const bandKeys = gfxTemplateName && gfxData[gfxTemplateName] ? Object.keys(gfxData[gfxTemplateName]) : []

  const selBase = 'w-full'

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null)
  const [reorderOverIdx, setReorderOverIdx] = useState<number | null>(null)
  const [replaceOverIdx, setReplaceOverIdx] = useState<number | null>(null)

  const REORDER_TYPE = `x-slot-reorder-${idx}`

  function isReorderDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.includes(REORDER_TYPE)
  }

  function isAnyReorderDrag(e: React.DragEvent): boolean {
    return e.dataTransfer.types.some(t => t.startsWith('x-slot-reorder-'))
  }

  function countSourcesByType(sourceType: SourceType): number {
    return row.sources.filter(s => s.sourceType === sourceType).length
  }

  function isSourceScreenShare(sourceName: string): boolean {
    return webrtcSources.find(s => s.name === sourceName)?.isScreenShare ?? false
  }

  function rowAlreadyHasScreenShare(excludeSlotIdx?: number): boolean {
    return row.sources.some((s, slotIdx) => {
      if (slotIdx === excludeSlotIdx) return false
      return s.sourceType === 'webrtc' && s.sourceValue && isSourceScreenShare(s.sourceValue)
    })
  }

  function getDisabledTypesForSlot(slotIdx: number): SourceType[] {
    const siblingTypes = row.sources.filter((_, i) => i !== slotIdx).map(s => s.sourceType)
    const disabled: SourceType[] = []
    if (siblingTypes.filter(t => t === 'vod').length >= MAX_TYPE_SOURCE_SLOTS) disabled.push('vod')
    if (siblingTypes.filter(t => t === 'rtmp').length >= MAX_TYPE_SOURCE_SLOTS) disabled.push('rtmp')
    return disabled
  }

  function handleSlotReorder(dropIdx: number) {
    if (reorderDragIdx === null || reorderDragIdx === dropIdx) return
    const newSources = [...row.sources]
    const [draggedSlot] = newSources.splice(reorderDragIdx, 1)
    newSources.splice(dropIdx, 0, draggedSlot)
    updateRow(idx, { sources: newSources })
    setReorderDragIdx(null)
    setReorderOverIdx(null)
  }

  function handleSlotReplace(slotIdx: number, e: React.DragEvent) {
    const sourceValue = e.dataTransfer.getData('text/plain')
    if (!sourceValue) return
    const dtype = e.dataTransfer.getData('dtype')
    const sourceType: SourceType = dtype === 'video'
      ? 'vod'
      : (e.dataTransfer.getData('sourceType') as SourceType) || 'webrtc'
    if (row.sources[slotIdx]?.sourceType === sourceType && row.sources[slotIdx]?.sourceValue === sourceValue) return
    if (row.sources.some((s, i) => i !== slotIdx && s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already added', 'This source is already in this row.')
      return
    }
    if (sourceType === 'vod' || sourceType === 'rtmp') {
      const siblingCount = row.sources.filter((s, i) => i !== slotIdx && s.sourceType === sourceType).length
      if (siblingCount >= MAX_TYPE_SOURCE_SLOTS) {
        showToast('Source limit reached', `A maximum of ${MAX_TYPE_SOURCE_SLOTS} ${sourceType.toUpperCase()} sources are allowed per row.`)
        return
      }
    }
    if (e.dataTransfer.getData('isScreenShare') === '1' && rowAlreadyHasScreenShare(slotIdx)) {
      showToast('Screen share already active', 'Only one screen share can be active at a time.')
      return
    }
    updateSource(idx, slotIdx, { sourceType, sourceValue, muted: row.sources[slotIdx]?.muted ?? false })
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    if (isReorderDrag(e)) return
    const sourceValue = e.dataTransfer.getData('text/plain')
    if (!sourceValue) return
    if (row.sources.length >= maxSlots) {
      showToast('Row is full', `This layout supports a maximum of ${maxSlots} source${maxSlots === 1 ? '' : 's'}.`)
      return
    }
    const dtype = e.dataTransfer.getData('dtype')
    const sourceType: SourceType = dtype === 'video'
      ? 'vod'
      : (e.dataTransfer.getData('sourceType') as SourceType) || 'webrtc'
    if ((sourceType === 'vod' || sourceType === 'rtmp') && countSourcesByType(sourceType) >= MAX_TYPE_SOURCE_SLOTS) {
      showToast('Source limit reached', `A maximum of ${MAX_TYPE_SOURCE_SLOTS} ${sourceType.toUpperCase()} sources are allowed per row.`)
      return
    }
    if (row.sources.some(s => s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already added', 'This source is already in this row.')
      return
    }
    if (e.dataTransfer.getData('isScreenShare') === '1' && rowAlreadyHasScreenShare()) {
      showToast('Screen share already active', 'Only one screen share can be active at a time.')
      return
    }
    updateRow(idx, {
      sources: [...row.sources, { slotKey: uid(), sourceType, sourceValue, muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: false }],
    })
  }

  return (
    <tr className={cn(isActive ? 'row-active' : isNext ? 'row-next' : '')}>
      {/* Q Button */}
      <td className="text-center p-1">
        {(() => {
          const hasCaption = !!row.captionId
          const hasValidSource = row.sources.some(s => s.sourceValue)
          const isFireable = hasCaption && hasValidSource
          const filledSourceCount = row.sources.filter(s => s.sourceValue).length
          const hasSourceMismatch = isFireable && maxSlots > 0 && filledSourceCount !== maxSlots
          const staleSlotCount = row.sources.filter(s =>
            s.sourceType === 'webrtc' &&
            s.sourceValue &&
            !participants.includes(s.sourceValue) &&
            !virtualSources.some(v => v.id === s.sourceValue),
          ).length
          const hasStaleSlot = staleSlotCount > 0
          return (
            <div id={`studio-qbtn-${q}-wrapper`} className="flex flex-col items-center gap-0.5">
              <button
                id={`studio-qbtn-${q}`}
                type="button"
                onClick={() => fire(q)}
                disabled={!isFireable || hasSourceMismatch || hasStaleSlot}
                title={hasStaleSlot ? 'One or more sources left the meeting - rejoin or clear the slot' : undefined}
                className={cn(
                  'w-12 py-2 xl:py-1 rounded-lg border font-bold text-xs xl:text-[12px] transition-all min-h-10 xl:min-h-0 flex items-center justify-center',
                  isFireable
                    ? hasStaleSlot
                      ? 'cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-400'
                      : hasSourceMismatch
                        ? 'cursor-not-allowed border-amber-400/40 bg-amber-400/8 text-amber-400'
                        : odd
                          ? 'cursor-pointer border-[#3031cb]/40 bg-[#3031cb]/8 text-[#3031cb] hover:bg-[#3031cb] hover:text-white hover:scale-105 active:scale-95 hover:shadow-[0_0_10px_rgba(48,49,203,0.4)]'
                          : 'cursor-pointer border-white/20 bg-white/5 text-white/75 hover:bg-white/12 hover:text-white hover:scale-105 active:scale-95'
                    : 'cursor-not-allowed border-white/8 bg-white/2 text-white/20',
                )}
              >
                Q{q}
              </button>
              {hasStaleSlot ? (
                <div id={`studio-qbtn-${q}-stale-warning`} className="flex items-center gap-0.5 text-red-400" title={`${staleSlotCount} source${staleSlotCount === 1 ? '' : 's'} left the meeting`}>
                  <AlertTriangle size={9} />
                  <span className="text-[8px] font-medium leading-none">stale</span>
                </div>
              ) : hasSourceMismatch && (
                <div id={`studio-qbtn-${q}-mismatch-warning`} className="flex items-center gap-0.5 text-amber-400" title={`${row.sources.length} of ${maxSlots} windows filled`}>
                  <AlertTriangle size={9} />
                  <span className="text-[8px] font-medium leading-none">{filledSourceCount}/{maxSlots}</span>
                </div>
              )}
            </div>
          )
        })()}
      </td>

      {/* Caption - depends on global Group selection */}
      <td id={`studio-qrow-${idx}-caption`} className="p-1 w-48">
        <div className="flex flex-col gap-0.5">
          <Select
            value={row.captionId}
            onValueChange={v => onCaptionChange(idx, v)}
            disabled={!selectedGroup || isActive}
            className={selBase}
          >
            <SelectItem value="">-- Caption --</SelectItem>
            {groupLayouts.map(l => (
              <SelectItem key={l.id} value={String(l.id)}>{l.caption} (W:{l.windowsCount})</SelectItem>
            ))}
          </Select>
          <span className={cn('text-[10px] xl:text-[9px] px-2 py-1 xl:px-1.5 xl:py-0.5 rounded self-start border',
            entry ? 'bg-[#3031cb]/8 text-[#3031cb] border-[#3031cb]/25' : 'bg-white/3 text-white/55 border-white/8',
          )}>
            {entry ? `max ${maxSlots}` : selectedGroup ? 'no layout' : 'no group'}
          </span>
        </div>
      </td>

      {/* GFX Start */}
      <td className="p-1 w-44">
        <GfxMultiSelect type="start" selected={row.gfxStart} bandKeys={bandKeys}
          disabledKeys={row.gfxStop}
          onChange={keys => updateRow(idx, { gfxStart: keys })} />
      </td>

      {/* GFX Stop */}
      <td className="p-1 w-44">
        <GfxMultiSelect type="stop" selected={row.gfxStop} bandKeys={bandKeys}
          disabledKeys={row.gfxStart}
          onChange={keys => updateRow(idx, { gfxStop: keys })} />
      </td>

      {/* Sources */}
      <td id={`studio-qrow-${idx}-sources`} className="p-1">
        <div
          className={cn(
            'flex flex-col gap-1 min-h-6 rounded transition-colors',
            isDraggingOver && 'outline outline-[#3031cb]/40 bg-[#3031cb]/4',
          )}
          onDragOver={e => { e.preventDefault(); if (!isAnyReorderDrag(e)) setIsDraggingOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false) }}
          onDrop={handleDrop}
        >
          {row.sources.map((slot, slotIdx) => {
            const usedValues = row.sources
              .filter((s, si) => si !== slotIdx && s.sourceType === slot.sourceType)
              .map(s => s.sourceValue)
              .filter(Boolean)
            return (
              <div
                id={`studio-qrow-${idx}-slot-drag-${slotIdx}`}
                key={slot.slotKey ?? slotIdx}
                draggable={row.sources.length > 1}
                onDragStart={e => {
                  setReorderDragIdx(slotIdx)
                  e.dataTransfer.setData(REORDER_TYPE, String(slotIdx))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); setReplaceOverIdx(null) }}
                onDragOver={e => {
                  if (isReorderDrag(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setReorderOverIdx(slotIdx)
                  } else if (!isAnyReorderDrag(e)) {
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
                  } else {
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
                  rowIdx={idx}
                  slotIdx={slotIdx}
                  slot={slot}
                  participants={participants}
                  virtualSources={virtualSources}
                  rtmpSources={rtmpSources}
                  videoAssets={videoAssets}
                  usedValues={usedValues}
                  disabledTypes={getDisabledTypesForSlot(slotIdx)}
                  onUpdate={patch => {
                    if ('muted' in patch && !('sourceType' in patch)) {
                      muteSource(idx, slotIdx, !!patch.muted)
                    } else {
                      updateSource(idx, slotIdx, 'sourceType' in patch ? { ...patch, muted: slot.muted } : patch)
                    }
                  }}
                  isLoadingVideoAssets={isLoadingVideoAssets}
                  onVolumeChange={volume => setSourceVolume(idx, slotIdx, volume)}
                  onTransformChange={patch => setSourceTransform(idx, slotIdx, patch)}
                  onRemove={() => {
                    removeSource(idx, slotIdx)
                  }}
                  openVideoPopup={openVideoPopup}
                  onShowToast={(title, description) => showToast(title, description)}
                  isActive={isActive}
                  isDragging={reorderDragIdx === slotIdx}
                  isDragDisabled={row.sources.length <= 1}
                />
              </div>
            )
          })}
          {reorderDragIdx !== null && (
            <div
              id={`studio-qrow-${idx}-slot-drop-end`}
              onDragOver={e => {
                if (isReorderDrag(e)) { e.preventDefault(); e.stopPropagation(); setReorderOverIdx(row.sources.length) }
              }}
              onDragLeave={() => setReorderOverIdx(null)}
              onDrop={e => {
                if (isReorderDrag(e)) { e.preventDefault(); e.stopPropagation(); handleSlotReorder(row.sources.length) }
              }}
              className={cn('h-1.5 rounded transition-all', reorderOverIdx === row.sources.length && 'border-b-2 border-[#3031cb]')}
            />
          )}
          {row.sources.length < maxSlots && (
            <button
              id={`studio-qrow-${idx}-btn-add-source`}
              type="button"
              onClick={() => addSource(idx)}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isAnyReorderDrag(e)) setIsDraggingOver(true) }}
              onDrop={e => { e.stopPropagation(); handleDrop(e) }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 xl:px-2 xl:py-0.5 text-xs xl:text-[10px] rounded border border-dashed border-white/12 text-white/35 hover:border-white/25 hover:text-white/55 cursor-pointer transition-colors self-start min-h-8 xl:min-h-0"
            >
              <Plus size={9} /> Add source
            </button>
          )}
          {row.sources.length === 0 && (
            <span className="text-[10px] text-white/20 italic px-1 py-0.5">
              {entry
                ? 'Drag participant or click Add source'
                : selectedGroup
                  ? 'Select caption first'
                  : 'Select group first'}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
