import { createContext, useEffect, useState, type ReactNode } from 'react'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { getStorage } from '../../lib/storage'
import { PLAN_LIMITS, TRIAL_PLAN_LIMITS, type PlanLimits } from '../../lib/planLimits'
import { claimPcrTrial } from '../../lib/authService'
import type { SubscriptionInvoice } from '../../types/subscriptionPlan'
import type { UserData } from '../../types/user'

interface SubscriptionContextValue {
  isSubscribed: boolean
  activePlanCode: string | null
  planLimits: PlanLimits | null
  billingPeriodStart: Date | null
  billingPeriodEnd: Date | null
  isLoading: boolean
  error: string | null
  isTrialing: boolean
  trialEndsAt: Date | null
  daysRemaining: number
  invoice: SubscriptionInvoice | null
  hasClaimedTrial: boolean
  refetch: () => Promise<void>
}

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

interface SubscriptionProviderProps {
  children: ReactNode
}

async function fetchSubscription(gatewayId: string): Promise<SubscriptionInvoice | null> {
  try {
    const res = await http.get<{ code: number; data: SubscriptionInvoice[] }>(
      apiConfig.dotnetApiBase,
      `v1/recurly/subscription/${gatewayId}`
    )
    if (res.code !== 1 || !res.data?.length) return null
    return res.data[0]
  } catch {
    return null
  }
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [activePlanCode, setActivePlanCode] = useState<string | null>(null)
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [billingPeriodStart, setBillingPeriodStart] = useState<Date | null>(null)
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<Date | null>(null)
  const [isTrialing, setIsTrialing] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null)
  const [hasClaimedTrial, setHasClaimedTrial] = useState(false)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const channelName = getStorage<string>('pcr_channel_name') ?? ''
      const channelId = getStorage<string>('pcr_channel_id') ?? ''
      const gatewayId = `${channelName}_${channelId}`

      const subscription = await fetchSubscription(gatewayId)
      const user = getStorage<UserData>('pcr_user')
      const claimed = user?.hasClaimedPcrTrial ?? false

      setHasClaimedTrial(claimed)
      setInvoice(subscription)

      const subState = subscription?.subscription?.state
      const expiresAt = subscription?.subscription?.expires_at ? new Date(subscription.subscription.expires_at) : null
      const isExpired = expiresAt ? expiresAt <= new Date() : true
      const isActiveSubscription = (subState === 'active' || subState === 'trial') || (subState === 'canceled' && !isExpired)

      if (isActiveSubscription) {
        if (!subscription) return
        const planCode = subscription.subscription.plan.code
        setActivePlanCode(planCode)
        setIsSubscribed(true)
        setBillingPeriodStart(new Date(subscription.subscription.current_term_started_at))
        setBillingPeriodEnd(new Date(subscription.subscription.current_term_ends_at))

        const trialEndStr = subscription.subscription.trial_ends_at
        const isInTrial = trialEndStr && new Date(trialEndStr) > new Date()

        if (isInTrial) {
          setIsTrialing(true)
          const trialEnd = new Date(trialEndStr!)
          setTrialEndsAt(trialEnd)
          const now = new Date()
          const remaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          setDaysRemaining(Math.max(0, remaining))
          setPlanLimits(TRIAL_PLAN_LIMITS[planCode] ?? null)
          try {
            await claimPcrTrial()
          } catch {
            // Silently fail if claim fails - subscription data is still valid
          }
        } else {
          setIsTrialing(false)
          setTrialEndsAt(null)
          setDaysRemaining(0)
          setPlanLimits(PLAN_LIMITS[planCode] ?? null)
        }
      } else {
        setActivePlanCode(null)
        setIsSubscribed(false)
        setPlanLimits(null)
        setBillingPeriodStart(null)
        setBillingPeriodEnd(null)
        setIsTrialing(false)
        setTrialEndsAt(null)
        setDaysRemaining(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription')
      setIsSubscribed(false)
      setActivePlanCode(null)
      setPlanLimits(null)
      setIsTrialing(false)
      setTrialEndsAt(null)
      setDaysRemaining(0)
      setInvoice(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  const value: SubscriptionContextValue = {
    isSubscribed,
    activePlanCode,
    planLimits,
    billingPeriodStart,
    billingPeriodEnd,
    isLoading,
    error,
    isTrialing,
    trialEndsAt,
    daysRemaining,
    invoice,
    hasClaimedTrial,
    refetch,
  }

  return (
    <SubscriptionContext value={value}>
      {children}
    </SubscriptionContext>
  )
}
