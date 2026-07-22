import { useState, useEffect } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { GfxDraggableContent } from './GfxDraggableContent'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoad: () => Promise<string>
  onSave: (text: string) => Promise<boolean>
}

const MAX_LEN = 20

export function GfxLocationDialog({ open, onOpenChange, onLoad, onSave }: Props) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const text = await onLoad()
        if (!cancelled) setValue(text)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(value)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <RadixDialog.Portal>
          <GfxDraggableContent className="w-full max-w-sm bg-secondary-bg border border-white/8 rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 cursor-move select-none">
              <div>
                <RadixDialog.Title className="text-base font-semibold text-white">Location Band</RadixDialog.Title>
                <RadixDialog.Description className="text-sm text-white/55 mt-0.5">
                  Single location label · max {MAX_LEN} characters
                </RadixDialog.Description>
              </div>
              <span className="text-sm text-white/35 mr-1">drag to move</span>
              <RadixDialog.Close asChild>
                <button type="button" className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/6 cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </RadixDialog.Close>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-white/35">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-white/55 font-semibold uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    value={value}
                    maxLength={MAX_LEN}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Enter location…"
                    className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-base text-white/90 placeholder-white/25 focus:outline-none focus:border-[#3031cb]/40 min-h-10"
                  />
                  <p className="text-sm text-white/30 text-right">{value.length}/{MAX_LEN}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/6 bg-white/1 rounded-b-xl">
              <RadixDialog.Close asChild>
                <button type="button" className="px-4 py-2 text-base text-white/72 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors min-h-10">
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => setConfirmOpen(true)}
                className="flex h-10 items-center justify-center gap-1.5 px-4 text-base font-semibold bg-[#3031cb] hover:bg-[#2626a8] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save Location
              </button>
            </div>
          </GfxDraggableContent>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save location?"
        description={value ? `Set location to "${value}".` : 'Clear the location text.'}
        confirmLabel="Save"
        onConfirm={handleSave}
      />
    </>
  )
}
