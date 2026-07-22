import { useState, useEffect, useCallback, useRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { GfxDraggableContent } from './GfxDraggableContent'
import type { GfxNewsItem } from '../../types/studio'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  maxLength?: number
  onLoad: () => Promise<GfxNewsItem[]>
  onSave: (items: GfxNewsItem[]) => Promise<boolean>
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

export function GfxBandEditDialog({ open, onOpenChange, label, maxLength, onLoad, onSave }: Props) {
  const [items, setItems] = useState<GfxNewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)
  const dragSourceRef = useRef<number | null>(null)
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await onLoad()
        if (!cancelled) setItems(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: uid(), news_value: '', disabled: true }])
  }, [])

  const updateItem = useCallback((idx: number, patch: Partial<GfxNewsItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteIdx !== null) setItems(prev => prev.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
  }, [deleteIdx])

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragSourceRef.current = idx
    setDragSourceIndex(idx)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(idx)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    const sourceIdx = dragSourceRef.current
    dragSourceRef.current = null
    setDragSourceIndex(null)
    setDragOverIndex(null)
    if (sourceIdx === null || sourceIdx === targetIdx) return
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(sourceIdx, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    dragSourceRef.current = null
    setDragSourceIndex(null)
    setDragOverIndex(null)
  }, [])

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(items)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <RadixDialog.Portal>
          <GfxDraggableContent className="w-full max-w-xl bg-secondary-bg border border-white/8 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/6 cursor-move select-none">
              <div>
                <RadixDialog.Title className="text-base font-semibold text-white">{label}</RadixDialog.Title>
                <RadixDialog.Description className="text-sm text-white/55 mt-0.5">
                  Edit news content
                </RadixDialog.Description>
              </div>
              <span className="text-sm text-white/35 mr-1">drag to move</span>
              <RadixDialog.Close asChild>
                <button type="button" className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/6 cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </RadixDialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-white/35">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="text-sm">Loading content…</span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14">
                  <p className="text-sm text-white/55">No items yet.</p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex h-10 items-center justify-center gap-1.5 px-4 text-base text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer transition-colors"
                  >
                    <Plus size={16} /> Add first item
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDrop={e => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-center gap-2.5 px-3.5 py-3 rounded-lg border transition-colors',
                        dragOverIndex === idx && dragSourceIndex !== idx
                          ? 'border-emerald-300 bg-emerald-50'
                          : dragSourceIndex === idx
                          ? 'border-white/5 bg-white/2 opacity-40 cursor-grabbing'
                          : !item.disabled
                          ? 'border-white/5 bg-white/1 opacity-50'
                          : 'border-white/8 bg-white/3 hover:border-white/12',
                      )}
                    >
                      <GripVertical size={16} className="shrink-0 text-white/18 cursor-grab" />
                      <span className="shrink-0 text-sm text-white/55 font-mono w-4 text-right">{idx + 1}</span>
                      <input
                        type="text"
                        value={item.news_value}
                        maxLength={maxLength}
                        onChange={e => updateItem(idx, { news_value: e.target.value })}
                        placeholder="Enter news text…"
                        className="flex-1 min-w-0 bg-transparent text-base text-white/90 placeholder-white/20 outline-none min-h-10 px-1.5"
                      />
                      {maxLength !== undefined && (
                        <span className={cn(
                          'shrink-0 text-sm tabular-nums',
                          item.news_value.length >= maxLength ? 'text-red-400' : 'text-white/35',
                        )}>
                          {item.news_value.length}/{maxLength}
                        </span>
                      )}
                      <label className="relative w-8 h-4.5 shrink-0 cursor-pointer" title={item.disabled ? 'Turn off' : 'Turn on'}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={item.disabled}
                          onChange={e => updateItem(idx, { disabled: e.target.checked })}
                        />
                        <span className={cn('absolute inset-0 rounded-full transition-colors border', item.disabled ? 'bg-emerald-100 border-emerald-300' : 'bg-surface-2 border-primary-border')} />
                        <span className={cn('absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all', item.disabled ? 'translate-x-4 bg-emerald-600 shadow-sm' : 'bg-secondary-text/50')} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setDeleteIdx(idx)}
                        title="Remove item"
                        className="shrink-0 p-1 rounded text-white/22 hover:text-red-400 hover:bg-red-950/20 cursor-pointer transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-t border-white/6 bg-white/1 rounded-b-xl">
              <button
                type="button"
                onClick={addItem}
                className="flex h-10 items-center justify-center gap-1.5 px-4 text-base text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer transition-colors"
              >
                <Plus size={16} /> Add Item
              </button>
              <div className="flex items-center gap-2">
                <RadixDialog.Close asChild>
                  <button type="button" className="px-4 py-2 text-base text-white/72 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors min-h-10">
                    Cancel
                  </button>
                </RadixDialog.Close>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmSave(true)}
                  className="flex h-10 items-center justify-center gap-1.5 px-4 text-base font-semibold bg-[#3031cb] hover:bg-[#2829b0] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </GfxDraggableContent>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save band content?"
        description={`Update news items for "${label}". Changes apply immediately to the live template.`}
        confirmLabel="Save"
        onConfirm={handleSave}
      />

      <ConfirmDialog
        open={deleteIdx !== null}
        onOpenChange={open => { if (!open) setDeleteIdx(null) }}
        title="Remove news item?"
        description="This item will be removed from the band content."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  )
}
