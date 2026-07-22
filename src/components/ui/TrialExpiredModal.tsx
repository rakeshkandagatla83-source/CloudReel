import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { X, Lock } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TrialExpiredModalProps {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  planName?: string
}

export function TrialExpiredModal({
  id,
  open,
  onOpenChange,
  planName = 'Starter',
}: TrialExpiredModalProps) {
  const navigate = useNavigate()

  const handleViewPlans = () => {
    onOpenChange(false)
    navigate('/subscription')
  }

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
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
                <Lock size={16} className="text-red-400" />
              </span>
              <div>
                <Dialog.Title className="text-sm font-semibold text-white">
                  Trial Period Ended
                </Dialog.Title>
                <Dialog.Description className="text-xs text-white/40 mt-0.5">
                  Your {planName} plan trial has expired
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close
              id={`${id}-close-btn`}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none ml-4"
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-lg p-4 mb-5">
            <p className="text-sm text-white/70">
              Your free trial has ended. To continue using all features and keep your quota, you need to subscribe to a paid plan.
            </p>
          </div>

          <p className="text-sm text-white/55 mb-5">
            Choose from our flexible plans and start publishing today without interruptions.
          </p>

          <div className="flex gap-2.5 justify-end">
            <Dialog.Close
              id={`${id}-cancel-btn`}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/55 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors border border-white/8 outline-none"
            >
              Close
            </Dialog.Close>
            <button
              id={`${id}-upgrade-btn`}
              type="button"
              onClick={handleViewPlans}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer bg-[#3031cb] hover:bg-[#2626a8] text-white border border-[#3031cb] transition-colors"
            >
              View Plans →
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
