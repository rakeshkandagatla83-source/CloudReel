import * as Dialog from '@radix-ui/react-dialog'
import { X, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TrialQuota {
  label: string
  trial: number | string
  full: number | string
  unit: string
}

interface TrialQuotasModalProps {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
  trialDays: number
  quotas: TrialQuota[]
}

export function TrialQuotasModal({
  id,
  open,
  onOpenChange,
  planName,
  trialDays,
  quotas,
}: TrialQuotasModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          id={`${id}-overlay`}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-200"
        />
        <Dialog.Content
          id={`${id}-content`}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'bg-secondary-bg border border-white/10 rounded-2xl shadow-2xl p-6',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-200 origin-center',
          )}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-sm font-semibold text-white">
                {planName} Trial Quotas
              </Dialog.Title>
              <Dialog.Description className="text-xs text-white/40 mt-0.5">
                {trialDays}-day free trial includes:
              </Dialog.Description>
            </div>
            <Dialog.Close
              id={`${id}-close-btn`}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none ml-4"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="space-y-3 mb-6">
            {quotas.map((quota) => (
              <div key={quota.label} className="bg-white/3 border border-white/8 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-white">{quota.label}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-white/40 mb-1">During Trial</p>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-green-400 shrink-0" />
                      <span className="text-sm font-semibold text-green-400">
                        {quota.trial} {quota.unit}
                      </span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/8" />
                  <div className="flex-1">
                    <p className="text-xs text-white/40 mb-1">Full Plan</p>
                    <span className="text-sm font-semibold text-white">
                      {quota.full} {quota.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/50 mb-5 leading-relaxed">
            After your trial ends, you'll be charged and get access to the full plan quotas. Cancel anytime before your trial ends to avoid charges.
          </p>

          <Dialog.Close
            id={`${id}-close-action-btn`}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white/70 cursor-pointer hover:bg-white/5 hover:text-white transition-colors border border-white/8 outline-none"
          >
            Got it
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
