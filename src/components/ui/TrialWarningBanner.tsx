import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertCircle } from 'lucide-react'

interface TrialWarningBannerProps {
  daysRemaining: number
  onUpgradeClick?: () => void
}

export function TrialWarningBanner({ daysRemaining, onUpgradeClick }: TrialWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const navigate = useNavigate()

  if (isDismissed) return null

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    } else {
      navigate('/subscription')
    }
  }

  const isUrgent = daysRemaining <= 3

  return (
    <div
      id="trial-warning-banner"
      className={`w-full px-4 py-3 border-b transition-colors ${
        isUrgent
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle
            size={16}
            className={isUrgent ? 'text-red-400' : 'text-amber-400'}
          />
          <p className="text-sm text-white/80">
            Your free trial ends in{' '}
            <span className="font-semibold text-white">
              {daysRemaining === 0 ? 'today' : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`}
            </span>
            . Upgrade now to continue using all features.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="trial-banner-upgrade-btn"
            onClick={handleUpgrade}
            className="px-3 py-1.5 text-xs font-semibold cursor-pointer bg-[#3031cb] hover:bg-[#2626a8] text-white rounded transition-colors border border-[#3031cb]"
          >
            Upgrade
          </button>
          <button
            id="trial-banner-dismiss-btn"
            onClick={() => setIsDismissed(true)}
            className="text-white/40 hover:text-white/60 transition-colors cursor-pointer outline-none"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
