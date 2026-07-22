import { Dialog } from '../../components/ui/Dialog'
import type { DbLayout } from '../../types/layoutBuilder'

interface JsonViewerModalProps {
  layout: DbLayout | null
  onClose: () => void
}

export function JsonViewerModal({ layout, onClose }: JsonViewerModalProps) {
  if (!layout) return null

  let pretty: unknown = layout
  try {
    pretty = { ...layout, pubnubMsg: JSON.parse(layout.pubnubMsg) }
  } catch {
    // ignore malformed pubnubMsg
  }

  return (
    <Dialog
      open={!!layout}
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`JSON — ${layout.caption} (ID: ${layout.id})`}
      className="max-w-2xl"
    >
      <div className="max-h-[60vh] overflow-auto rounded-lg bg-black/30 border border-white/8 p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
        <pre className="font-mono text-[11px] text-white/60 whitespace-pre-wrap break-all leading-relaxed">
          {JSON.stringify(pretty, null, 2)}
        </pre>
      </div>
    </Dialog>
  )
}
