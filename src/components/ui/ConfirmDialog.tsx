import * as RadixDialog from '@radix-ui/react-dialog'
import { cn } from '../../lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  children?: React.ReactNode
  confirmDisabled?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          onInteractOutside={e => e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'bg-secondary-bg border border-white/8 rounded-xl shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200',
          )}
        >
          <div className="p-6">
            <RadixDialog.Title className="text-base font-semibold text-white">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1.5 text-sm text-white/50">
                {description}
              </RadixDialog.Description>
            )}
            {children && <div className="mt-4">{children}</div>}
            <div className="flex items-center justify-end gap-2 mt-6">
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-1.5 text-xs text-white/45 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  {cancelLabel}
                </button>
              </RadixDialog.Close>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onConfirm()
                }}
                disabled={confirmDisabled}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer transition-colors',
                  confirmDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : variant === 'danger'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-[#3031cb] hover:bg-[#2626a8]',
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
