import { useEffect, useState } from 'react'
import { TrialWarningBanner } from '../../components/ui/TrialWarningBanner'
import { TrialExpiredModal } from '../../components/ui/TrialExpiredModal'
import { useSubscription } from './useSubscription'

export function TrialManager() {
  const { isTrialing, daysRemaining, activePlanCode, hasClaimedTrial } = useSubscription()
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  useEffect(() => {
    if (isTrialing && daysRemaining === 0 && hasClaimedTrial) {
      setShowExpiredModal(true)
    } else {
      setShowExpiredModal(false)
    }
  }, [isTrialing, daysRemaining, hasClaimedTrial])

  if (!isTrialing || !hasClaimedTrial) return null

  const getPlanName = (): string => {
    switch (activePlanCode) {
      case 'pcr-starter-30h':
        return 'Starter'
      case 'pcr-professional-60h':
        return 'Professional'
      case 'pcr-enterprise-90h':
        return 'Enterprise'
      default:
        return 'Free'
    }
  }

  return (
    <>
      {daysRemaining > 0 && (
        <TrialWarningBanner daysRemaining={daysRemaining} />
      )}
      <TrialExpiredModal
        id="trial-expired-modal"
        open={showExpiredModal}
        onOpenChange={setShowExpiredModal}
        planName={getPlanName()}
      />
    </>
  )
}
