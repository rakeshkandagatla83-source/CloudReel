import { useState, useRef } from 'react'
import { Dialog, DialogFooter, DialogClose } from '../../components/ui/Dialog'
import { Save } from 'lucide-react'

interface SaveTemplateDialogProps {
  open: boolean
  initialName: string
  onClose: () => void
  onSave: (name: string) => void
}

// Inner component receives a stable key so it remounts each time the dialog opens,
// giving the input a fresh default value without needing an effect.
function SaveForm({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder="Template name..."
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/30 placeholder:text-white/25"
      />
      <DialogFooter>
        <DialogClose>
          <button
            type="button"
            className="px-4 py-1.5 text-xs text-white/45 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </DialogClose>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#3031cb] hover:bg-[#2626a8] rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={12} />
          Save
        </button>
      </DialogFooter>
    </>
  )
}

export function SaveTemplateDialog({ open, initialName, onClose, onSave }: SaveTemplateDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose() }}
      title="Save Template"
      description="Give this layout a name to save it locally."
    >
      <SaveForm
        key={open ? `open-${initialName}` : 'closed'}
        initialName={initialName}
        onClose={onClose}
        onSave={onSave}
      />
    </Dialog>
  )
}
