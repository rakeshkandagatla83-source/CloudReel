import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { X, Lock } from 'lucide-react'
import { cn } from '../../lib/utils'

interface UpgradeModalProps {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  featureType: 'no-subscription' | 'meeting-hours' | 'publishing-hours' | 'uploads'
  used?: number
  limit?: number
  unit?: string
  resetDate?: string
  customTitle?: string
  customSubtitle?: string
}

const FEATURE_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  'no-subscription': {
    title: 'Subscription Required',
    subtitle: 'You need an active subscription to create events.',
  },
  'meeting-hours': {
    title: 'Meeting Hours Limit Reached',
    subtitle: 'You\'ve used all your available meeting hours for this period.',
  },
  'publishing-hours': {
    title: 'Publishing Hours Limit Reached',
    subtitle: 'You\'ve used all your available publishing hours for this period.',
  },
  uploads: {
    title: 'Upload Limit Reached',
    subtitle: 'You\'ve reached your maximum uploads for this period.',
  },
}

export function UpgradeModal({
  id,
  open,
  onOpenChange,
  featureType,
  used,
  limit,
  unit,
  resetDate,
  customTitle,
  customSubtitle,
}: UpgradeModalProps) {
  const navigate = useNavigate()
  const defaultFeature = FEATURE_MESSAGES[featureType]
  const feature = customTitle || customSubtitle
    ? { title: customTitle ?? defaultFeature.title, subtitle: customSubtitle ?? defaultFeature.subtitle }
    : defaultFeature

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
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                <Lock size={16} className="text-amber-400" />
              </span>
              <div>
                <Dialog.Title className="text-sm font-semibold text-white">
                  {feature.title}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-white/40 mt-0.5">
                  {feature.subtitle}
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

          {featureType !== 'no-subscription' && (
            <div className="bg-white/3 border border-white/8 rounded-lg p-4 mb-5">
              <p className="text-sm text-white/70 mb-3">
                You've used <span className="font-semibold text-white">{used}</span> of{' '}
                <span className="font-semibold text-white">{limit}</span> {unit} this period.
              </p>
              {resetDate && (
                <p className="text-[11px] text-white/35 font-mono">
                  Usage resets {resetDate}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-white/55 mb-5">
            {featureType === 'no-subscription'
              ? 'Subscribe to get started with creating events and publishing.'
              : 'Upgrade your plan to increase your limits and continue publishing.'}
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
