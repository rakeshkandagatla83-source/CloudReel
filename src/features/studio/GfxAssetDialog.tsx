import { useState, useEffect, useCallback, useMemo } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, Loader2, Check, Search, Video } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { GfxDraggableContent } from './GfxDraggableContent'
import type { GfxAssetItem } from '../../types/studio'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bandKey: string
  label: string
  onLoadSelection: () => Promise<GfxAssetItem[]>
  onLoadLibrary: () => Promise<GfxAssetItem[]>
  onSave: (items: GfxAssetItem[]) => Promise<boolean>
}

// Find the name of the currently-saved asset in the library.
// Tries id → name → url/s3path in order so even partially-migrated data resolves correctly.
// logo_band: saved url is s3path — compare against library s3path as final fallback.
// l_band: saved url is previewurl — compare against library url as final fallback.
function findInitialName(bandKey: string, saved: GfxAssetItem[], library: GfxAssetItem[]): string | null {
  if (saved.length === 0 || library.length === 0) return null
  const first = saved[0]
  if (bandKey === 'logo_band') {
    const match = (first.id != null ? library.find(li => li.id != null && String(li.id) === String(first.id)) : undefined)
      ?? library.find(li => li.name === first.name)
      ?? (first.url ? library.find(li => li.s3path === first.url) : undefined)
    return match?.name ?? null
  }
  const match = library.find(li => li.name === first.name)
    ?? (first.url ? library.find(li => li.url === first.url) : undefined)
  return match?.name ?? null
}

function isVideoAsset(item: GfxAssetItem) {
  return item.type === 'gvideo' || /\.(mp4|webm)$/i.test(item.name) || /\.(mp4|webm)$/i.test(item.url ?? '')
}

export function GfxAssetDialog({ open, onOpenChange, bandKey, label, onLoadSelection, onLoadLibrary, onSave }: Props) {
  const [library, setLibrary] = useState<GfxAssetItem[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSearch('')
    void (async () => {
      setLoading(true)
      try {
        const [lib, sel] = await Promise.all([onLoadLibrary(), onLoadSelection()])
        if (!cancelled) {
          setLibrary(lib)
          setSelectedName(findInitialName(bandKey, sel, lib))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const results = q ? library.filter(i => i.name.toLowerCase().includes(q)) : [...library]
    if (selectedName) {
      const selectedIdx = results.findIndex(i => i.name === selectedName)
      if (selectedIdx > 0) {
        results.unshift(...results.splice(selectedIdx, 1))
      }
    }
    return results
  }, [library, search, selectedName])

  const toggleItem = useCallback((name: string) => {
    setSelectedName(prev => (prev === name ? null : name))
  }, [])

  const selectedItem = library.find(i => i.name === selectedName)

  async function handleSave() {
    setSaving(true)
    const items = selectedName ? library.filter(i => i.name === selectedName) : []
    const ok = await onSave(items)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <RadixDialog.Portal>
          <GfxDraggableContent className="w-full max-w-2xl bg-secondary-bg border border-white/8 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/6 cursor-move select-none">
              <div>
                <RadixDialog.Title className="text-base font-semibold text-white">{label}</RadixDialog.Title>
                <RadixDialog.Description className="text-sm text-white/35 mt-0.5">
                  Select asset{selectedItem && <span className="text-blue-400 ml-2">· {selectedItem.name}</span>}
                </RadixDialog.Description>
              </div>
              <span className="text-xs text-white/18 mr-1">drag to move</span>
              <RadixDialog.Close asChild>
                <button type="button" className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/6 cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </RadixDialog.Close>
            </div>

            {/* Search bar */}
            {!loading && library.length > 0 && (
              <div className="shrink-0 px-5 pt-3 pb-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search assets…"
                    className="w-full bg-white/4 border border-white/8 rounded-lg pl-8 pr-3 h-10 text-base text-white/70 placeholder-white/25 focus:outline-none focus:border-[#3031cb]/40"
                  />
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-white/35">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading assets…</span>
                </div>
              ) : library.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14">
                  <p className="text-sm text-white/30">No assets found.</p>
                  <p className="text-sm text-white/20">Upload assets in the Assets section to use here.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-14">
                  <p className="text-sm text-white/30">No assets match &quot;{search}&quot;.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filtered.map(item => {
                    const isSelected = item.name === selectedName
                    const isVideo = isVideoAsset(item)
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleItem(item.name)}
                        className={cn(
                          'relative flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all text-left',
                          isSelected
                            ? 'border-blue-500/60 bg-blue-950/25 ring-1 ring-blue-500/40'
                            : 'border-white/8 bg-white/2 hover:border-white/18 hover:bg-white/4',
                        )}
                      >
                        <div className="relative aspect-video bg-black/40 overflow-hidden">
                          {isVideo ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video size={22} className="text-white/30" />
                            </div>
                          ) : item.url ? (
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : null}
                          {isVideo && (
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-xs font-semibold bg-black/60 text-amber-400/90 leading-none">
                              VIDEO
                            </span>
                          )}
                          {isSelected && (
                            <>
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check size={12} className="text-black" />
                              </div>
                              <div className="absolute inset-0 ring-2 ring-inset ring-blue-500/50 rounded pointer-events-none" />
                            </>
                          )}
                        </div>
                        <p className={cn('px-2 py-1.5 text-sm truncate', isSelected ? 'text-blue-300' : 'text-white/45')}>
                          {item.name}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3.5 border-t border-white/6 bg-white/1 rounded-b-xl">
              <p className="text-sm text-white/35 min-w-0 truncate">
                {selectedItem
                  ? <span>Selected: <span className="text-blue-400 font-medium">{selectedItem.name}</span></span>
                  : <span className="text-white/22">No asset selected</span>}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <RadixDialog.Close asChild>
                  <button type="button" className="h-10 px-4 text-base text-white/40 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    Cancel
                  </button>
                </RadixDialog.Close>
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={() => setConfirmSave(true)}
                  className="flex items-center gap-1.5 h-10 px-4 text-base font-semibold bg-[#3031cb] hover:bg-[#2829b0] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save Selection
                </button>
              </div>
            </div>
          </GfxDraggableContent>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save asset selection?"
        description={selectedItem
          ? `Set "${selectedItem.name}" as the asset for "${label}". Changes apply immediately to the live template.`
          : `Clear the asset for "${label}". The band will have no asset selected.`}
        confirmLabel="Save"
        onConfirm={handleSave}
      />
    </>
  )
}
