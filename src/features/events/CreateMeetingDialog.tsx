import { useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Loader2, Radio } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Select, SelectItem } from '../../components/ui/Select'

const BITRATE_OPTIONS = ['120p', '180p', '240p', '360p', '480p', '720p', '1080p']

interface CreateMeetingDialogProps {
  open: boolean
  creating: boolean
  statusMsg: string
  onConfirm: (bitrate: string) => void
  onCancel: () => void
}

export function CreateMeetingDialog({ open, creating, statusMsg, onConfirm, onCancel }: CreateMeetingDialogProps) {
  const [bitrate, setBitrate] = useState('360p')

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          aria-describedby={undefined}
          onInteractOutside={e => e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'bg-surface border border-primary-border rounded-xl shadow-2xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200',
          )}
        >
          <div className="p-5 flex flex-col gap-4">
            <RadixDialog.Title className="text-sm font-semibold text-primary-text flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              Create Meeting
            </RadixDialog.Title>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-secondary-text">Bitrate</label>
                <Select
                  value={bitrate}
                  onValueChange={setBitrate}
                  disabled={creating}
                  className="w-full mt-1"
                >
                  {BITRATE_OPTIONS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {statusMsg && (
              <div className="flex items-center gap-1.5 text-xs text-secondary-text">
                <Loader2 size={11} className="animate-spin shrink-0" />
                {statusMsg}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={creating}
                className="px-4 py-1.5 text-xs text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(bitrate)}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold text-xs cursor-pointer transition-all bg-linear-to-r from-[#3031cb] to-[#a00812] hover:from-[#f01020] hover:to-[#2626a8] text-white shadow-[0_0_12px_rgba(48,49,203,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating
                  ? <><Loader2 size={11} className="animate-spin" /> Creating…</>
                  : <><Radio size={11} /> Create Meeting &amp; Go Live</>}
              </button>
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
