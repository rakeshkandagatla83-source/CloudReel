import { useCallback, useEffect, useRef, useState } from 'react'
import { getStorage, setStorage, removeStorage } from '../../lib/storage'
import { useStudioCtx } from './StudioContext'
import { CompactMonitorRow } from './CompactMonitorRow'
import { CompactBusPanel } from './CompactBusPanel'
import { CompactSourcePool } from './CompactSourcePool'
import { uid } from './useStudio'
import { MAX_SOURCE_SLOTS, MAX_TYPE_SOURCE_SLOTS } from '../../types/studio'
import type { SourceSlot, SourceType } from '../../types/studio'

// Pool slots always have slotKey assigned — enforce that via a narrowed type.
// displayName is captured at add/replace time so the friendly name persists
// even if the source later disappears from the sidebar (e.g. a dup is deleted).
type PoolSlot = SourceSlot & { slotKey: string; displayName?: string }

export function CompactView() {
  const {
    groupLayouts, layoutData, fireCompact, sendCompactPreload, compactTake,
    webrtcSources, virtualSources, participants, showToast, setCompactPoolSelectedValues,
  } = useStudioCtx()

  // ── Source pool state (fully independent from QButtonRow rows) ────────────
  // The pool is scoped to the current event. On mount, if the stored event ID
  // does not match the active event, the stale pool is discarded immediately
  // rather than shown to the operator.
  const currentEventId = getStorage<string>('studio_event_id') ?? ''

  const [sourcePool, setSourcePool] = useState<PoolSlot[]>(() => {
    const storedEventId = getStorage<string>('compact_pool_event_id') ?? ''
    if (storedEventId !== currentEventId) {
      removeStorage('compact_source_pool')
      removeStorage('compact_selected_keys')
      removeStorage('compact_preview_layout_id')
      removeStorage('compact_master_layout_id')
      removeStorage('compact_active_q')
      return []
    }
    return getStorage<PoolSlot[]>('compact_source_pool') ?? []
  })

  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(() => {
    const storedEventId = getStorage<string>('compact_pool_event_id') ?? ''
    if (storedEventId !== currentEventId) return new Set()
    const storedKeys = getStorage<string[]>('compact_selected_keys') ?? []
    const storedPool = getStorage<PoolSlot[]>('compact_source_pool') ?? []
    const validSlotKeys = new Set(storedPool.map(s => s.slotKey))
    return new Set(storedKeys.filter(k => validSlotKeys.has(k)))
  })

  // ── Bus selection state ───────────────────────────────────────────────────
  const [activePreviewLayoutId, setActivePreviewLayoutId] = useState<string | null>(() => {
    const storedEventId = getStorage<string>('compact_pool_event_id') ?? ''
    if (storedEventId !== currentEventId) return null
    // getStorage JSON-parses the decoded value, so numeric IDs like "42" come back
    // as the number 42. Coerce to string to keep the === comparison working.
    const stored = getStorage<unknown>('compact_preview_layout_id')
    return stored !== null ? String(stored) : null
  })
  const [activeMasterLayoutId, setActiveMasterLayoutId] = useState<string | null>(() => {
    const storedEventId = getStorage<string>('compact_pool_event_id') ?? ''
    if (storedEventId !== currentEventId) return null
    const stored = getStorage<unknown>('compact_master_layout_id')
    return stored !== null ? String(stored) : null
  })

  // ── Persistence effects (all state is declared above before any effects) ──
  useEffect(() => {
    setStorage('compact_source_pool', sourcePool)
    setStorage('compact_pool_event_id', currentEventId)
  }, [sourcePool, currentEventId])

  useEffect(() => {
    setStorage('compact_selected_keys', [...selectedSlotKeys])
  }, [selectedSlotKeys])

  useEffect(() => {
    if (activePreviewLayoutId !== null) {
      setStorage('compact_preview_layout_id', activePreviewLayoutId)
    } else {
      removeStorage('compact_preview_layout_id')
    }
  }, [activePreviewLayoutId])

  useEffect(() => {
    if (activeMasterLayoutId !== null) {
      setStorage('compact_master_layout_id', activeMasterLayoutId)
    } else {
      removeStorage('compact_master_layout_id')
    }
  }, [activeMasterLayoutId])

  // When a virtual source is deleted from the sidebar, evict its pool slot silently.
  // Selected dups are already blocked from deletion by the sidebar guard, so any
  // dup that actually gets deleted here is guaranteed to be unselected.
  const prevVirtualSourceIdsRef = useRef(new Set(virtualSources.map(v => v.id)))
  useEffect(() => {
    const currentIds = new Set(virtualSources.map(v => v.id))
    const deletedIds = [...prevVirtualSourceIdsRef.current].filter(id => !currentIds.has(id))
    prevVirtualSourceIdsRef.current = currentIds
    if (deletedIds.length > 0) {
      const deletedSet = new Set(deletedIds)
      setSourcePool(prev => prev.filter(s => s.sourceType !== 'webrtc' || !deletedSet.has(s.sourceValue)))
    }
  }, [virtualSources])

  // Keep context in sync so SourcesSidebar can guard dup deletion.
  useEffect(() => {
    const selectedValues = new Set(
      sourcePool.filter(s => selectedSlotKeys.has(s.slotKey)).map(s => s.sourceValue)
    )
    setCompactPoolSelectedValues(selectedValues)
  }, [selectedSlotKeys, sourcePool, setCompactPoolSelectedValues])

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedSources = sourcePool.filter(s => selectedSlotKeys.has(s.slotKey))
  const selectedCount = selectedSources.length

  // A pool slot is stale when its source is a webrtc participant that has left the
  // meeting (not in the current participants list and not a live virtual source).
  // Firing with any stale slot would push a broken layout, so disable fire on the
  // bus panel until the slot is cleared/replaced or the participant rejoins.
  const isSlotStale = (slot: PoolSlot) =>
    slot.sourceType === 'webrtc' &&
    !!slot.sourceValue &&
    !participants.includes(slot.sourceValue) &&
    !virtualSources.some(v => v.id === slot.sourceValue)
  const hasStaleSelection = selectedSources.some(isSlotStale)

  // ── Bus click handlers ────────────────────────────────────────────────────
  function handlePreviewLayoutClick(layoutId: string) {
    if (selectedCount === 0) {
      showToast('No sources selected', 'Check at least one source in the pool before firing.')
      return
    }
    if (hasStaleSelection) {
      showToast('Source left the meeting', 'A selected source is no longer connected. Remove or replace it before firing.')
      return
    }
    const entry = layoutData.find(l => String(l.id) === layoutId)
    if (!entry) return
    setActivePreviewLayoutId(layoutId)
    fireCompact(entry, selectedSources, 'preview')
  }

  function handleMasterLayoutClick(layoutId: string) {
    if (selectedCount === 0) {
      showToast('No sources selected', 'Check at least one source in the pool before firing.')
      return
    }
    if (hasStaleSelection) {
      showToast('Source left the meeting', 'A selected source is no longer connected. Remove or replace it before firing.')
      return
    }
    const entry = layoutData.find(l => String(l.id) === layoutId)
    if (!entry) return
    setActiveMasterLayoutId(layoutId)
    fireCompact(entry, selectedSources, 'master')
    setSelectedSlotKeys(new Set())
  }

  // ── Source pool management ────────────────────────────────────────────────
  function handleAddToPool(sourceType: SourceType, sourceValue: string, _isScreenShare: boolean, displayName: string) {
    if (sourcePool.some(s => s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already added', 'This source is already in the pool.')
      return
    }
    const newSlot: PoolSlot = {
      slotKey: uid(),
      sourceType,
      sourceValue,
      displayName,
      muted: false,
      volume: 100,
      panX: 0,
      panY: 0,
      zoom: 1,
      loop: false,
    }
    setSourcePool(prev => [...prev, newSlot])
  }

  function handleReplaceInPool(slotKey: string, sourceType: SourceType, sourceValue: string, _isScreenShare: boolean, displayName: string) {
    if (sourcePool.some(s => s.slotKey !== slotKey && s.sourceType === sourceType && s.sourceValue === sourceValue)) {
      showToast('Already in pool', 'This source is already in the pool.')
      return
    }
    setSourcePool(prev => prev.map(s => s.slotKey !== slotKey ? s : {
      ...s, sourceType, sourceValue, displayName, muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: false,
    }))
    // Deselect the replaced slot — selection is no longer valid for the new source
    setSelectedSlotKeys(prev => { const next = new Set(prev); next.delete(slotKey); return next })
    setActivePreviewLayoutId(null)
    setActiveMasterLayoutId(null)
  }

  function handleRemoveFromPool(slotKey: string) {
    setSourcePool(prev => prev.filter(s => s.slotKey !== slotKey))
    setSelectedSlotKeys(prev => {
      const next = new Set(prev)
      next.delete(slotKey)
      return next
    })
    // Clear bus selections if the removed source was part of the selected set
    // (the selected count may drop below the active layout's windowsCount)
    setActivePreviewLayoutId(null)
    setActiveMasterLayoutId(null)
  }

  const handleTake = useCallback(() => {
    compactTake()
    setSelectedSlotKeys(new Set())
    setActiveMasterLayoutId(activePreviewLayoutId)   // promote staged preview → master
    // Keep activePreviewLayoutId so the operator can see which layout is now live.
    // Both buses show the same layout after TAKE (green = last preview, red = live master).
    // Preview highlight only clears when a new preview layout is fired.
  }, [compactTake, activePreviewLayoutId])

  function handleToggleSelect(slotKey: string) {
    const isAdding = !selectedSlotKeys.has(slotKey)

    if (isAdding) {
      const slot = sourcePool.find(s => s.slotKey === slotKey)
      if (!slot) return

      if (selectedSlotKeys.size >= MAX_SOURCE_SLOTS) {
        showToast('Selection full', `Maximum ${MAX_SOURCE_SLOTS} sources can be selected.`)
        return
      }
      if (slot.sourceType === 'vod') {
        const selectedVodCount = sourcePool.filter(s => selectedSlotKeys.has(s.slotKey) && s.sourceType === 'vod').length
        if (selectedVodCount >= MAX_TYPE_SOURCE_SLOTS) {
          showToast('VOD limit reached', `Maximum ${MAX_TYPE_SOURCE_SLOTS} VOD sources can be selected.`)
          return
        }
      }
      if (slot.sourceType === 'rtmp') {
        const selectedRtmpCount = sourcePool.filter(s => selectedSlotKeys.has(s.slotKey) && s.sourceType === 'rtmp').length
        if (selectedRtmpCount >= MAX_TYPE_SOURCE_SLOTS) {
          showToast('RTMP limit reached', `Maximum ${MAX_TYPE_SOURCE_SLOTS} RTMP sources can be selected.`)
          return
        }
      }
      if (slot.sourceType === 'webrtc') {
        const isScreenShare = webrtcSources.find(ws => ws.name === slot.sourceValue)?.isScreenShare ?? false
        if (isScreenShare) {
          const hasScreenShareSelected = sourcePool.some(s =>
            selectedSlotKeys.has(s.slotKey) &&
            s.sourceType === 'webrtc' &&
            (webrtcSources.find(ws => ws.name === s.sourceValue)?.isScreenShare ?? false),
          )
          if (hasScreenShareSelected) {
            showToast('Screen share limit', 'Only one screen share can be selected at a time.')
            return
          }
        }
      }
    }

    // Compute next selection outside the updater - safe in a synchronous event handler
    const nextKeys = new Set(selectedSlotKeys)
    if (isAdding) nextKeys.add(slotKey)
    else nextKeys.delete(slotKey)

    setSelectedSlotKeys(nextKeys)

    // Defer preload so React can flush the selection state and paint the card highlight
    // before sending WebSocket messages. VOD preload sends 4 WS calls synchronously
    // which blocks the browser from painting if not deferred.
    if (isAdding) {
      const addedSlot = sourcePool.find(s => s.slotKey === slotKey)
      if (addedSlot) {
        setTimeout(() => {
          if (addedSlot.sourceType === 'webrtc') {
            // WebRTC uses sourceValue directly as userId - typeIndex is not used by sendCompactPreload
            sendCompactPreload(addedSlot, 0)
          } else {
            // VOD/RTMP: slot IDs are index-based (extIdForVodSlot / rtmpIdForSlot).
            // If the newly added source lands before any already-selected source of the
            // same type in pool order, those sources shift up by one slot index and must
            // be re-preloaded at their new index to stay in sync with what fireCompact will assign.
            const sameTySources = sourcePool.filter(
              s => nextKeys.has(s.slotKey) && s.sourceType === addedSlot.sourceType
            )
            const addedIdx = sameTySources.indexOf(addedSlot)
            sendCompactPreload(addedSlot, addedIdx)
            sameTySources.forEach((s, idx) => {
              if (idx > addedIdx) sendCompactPreload(s, idx)
            })
          }
        }, 0)
      }
    }
  }

  function handleUpdatePoolSlot(slotKey: string, patch: Partial<SourceSlot>) {
    setSourcePool(prev => prev.map(s => s.slotKey !== slotKey ? s : { ...s, ...patch }))
  }

  function handleReorderPool(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    setSourcePool(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  return (
    <div id="compact-view" className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Monitor row - full width, no changes */}
      <CompactMonitorRow onTake={handleTake} />

      {/* Content: pool (left/bottom) + bus (right/top on mobile) */}
      <div
        id="compact-view-content"
        className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden gap-2 p-2"
      >
        {/* Bus column - right on desktop, top on mobile (order-1) */}
        <div id="compact-view-bus-col" className="order-1 sm:order-2 sm:w-1/2 shrink-0 sm:shrink overflow-y-auto">
          <CompactBusPanel
            allLayouts={groupLayouts}
            activePreviewLayoutId={activePreviewLayoutId}
            activeMasterLayoutId={activeMasterLayoutId}
            onPreviewLayoutClick={handlePreviewLayoutClick}
            onMasterLayoutClick={handleMasterLayoutClick}
            selectedCount={selectedCount}
            hasStaleSelection={hasStaleSelection}
          />
        </div>

        {/* Pool column - left on desktop, bottom on mobile (order-2) */}
        <div id="compact-view-pool-col" className="order-2 sm:order-1 flex-1 min-h-0 overflow-hidden flex flex-col">
          <CompactSourcePool
            sourcePool={sourcePool}
            selectedSlotKeys={selectedSlotKeys}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemoveFromPool}
            onReorder={handleReorderPool}
            onAdd={handleAddToPool}
            onReplace={handleReplaceInPool}
            onUpdate={handleUpdatePoolSlot}
          />
        </div>
      </div>
    </div>
  )
}
