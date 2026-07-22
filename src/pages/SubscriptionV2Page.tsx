import { useMemo, useState } from 'react'
import { getCountries } from 'libphonenumber-js'
import { Check, Loader2, AlertCircle, Globe, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { getCurrencyForCountry } from '../lib/countryCurrencyUtils'
import { usePublicPlans } from '../features/subscriptionV2/usePublicPlans'
import { useCheckout } from '../features/subscriptionV2/useCheckout'
import {
  useMySubscription,
  useCancelSubscription,
  useChangePlan,
} from '../features/subscriptionV2/useMySubscription'
import { GatewayPickerModal } from '../features/subscriptionV2/GatewayPickerModal'
import { ActiveSubscriptionCard } from '../features/subscriptionV2/ActiveSubscriptionCard'
import { formatPrice, billingCycleLabel } from '../features/subscriptionV2/format'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Toaster } from '../components/ui/Toast'
import type { PlanGroup, PublicPlan } from '../types/subscriptionV2'

function detectCountry(): string {
  try {
    const locale = navigator.language || 'en-US'
    const parts = locale.split('-')
    if (parts.length > 1 && parts[1].length === 2) {
      return parts[1].toUpperCase()
    }
  } catch {
    /* ignore */
  }
  return 'US'
}

function groupByPlan(plans: PublicPlan[]): PlanGroup[] {
  const map = new Map<number, PlanGroup>()
  for (const p of plans) {
    let group = map.get(p.planId)
    if (!group) {
      group = {
        planId: p.planId,
        planCode: p.planCode,
        planName: p.planName,
        description: p.description,
        billingCycle: p.billingCycle,
        meetingHours: p.meetingHours,
        platforms: p.platforms,
        publishingHours: p.publishingHours,
        uploads: p.uploads,
        gateways: [],
      }
      map.set(p.planId, group)
    }
    group.gateways.push(p)
  }
  return Array.from(map.values())
}

interface PlanCardProps {
  group: PlanGroup
  highlighted: boolean
  isCurrentPlan: boolean
  hasActiveSubscription: boolean
  currentGatewayId: number | null
  onSubscribeClick: (group: PlanGroup) => void
  onSwitchClick: (group: PlanGroup) => void
}

function PlanCard({
  group,
  highlighted,
  isCurrentPlan,
  hasActiveSubscription,
  currentGatewayId,
  onSubscribeClick,
  onSwitchClick,
}: PlanCardProps) {
  const headlineMapping = group.gateways[0]

  const features = [
    group.meetingHours != null && `${group.meetingHours} meeting hours`,
    group.publishingHours != null && `${group.publishingHours} publishing hours`,
    group.uploads != null && `${group.uploads} uploads`,
    group.platforms != null && `${group.platforms} simultaneous platforms`,
  ].filter(Boolean) as string[]

  const switchEligible =
    hasActiveSubscription &&
    !isCurrentPlan &&
    currentGatewayId !== null &&
    group.gateways.some(g => g.gatewayId === currentGatewayId)

  return (
    <div
      id={`subscription-v2-card-${group.planCode}`}
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-all',
        isCurrentPlan
          ? 'border-emerald-500/45 bg-linear-to-b from-[#0d1d18] to-[#0a1020] shadow-[0_0_40px_rgba(16,185,129,0.08)]'
          : highlighted
            ? 'border-[#3031cb]/40 bg-linear-to-b from-[#1a0a0d] to-[#0a1020] shadow-[0_0_40px_rgba(48,49,203,0.08)]'
            : 'border-white/8 bg-surface hover:border-white/15',
      )}
    >
      {isCurrentPlan && (
        <div
          id={`subscription-v2-card-badge-current-${group.planCode}`}
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-[#06120e]"
        >
          <Check size={11} strokeWidth={3} />
          Current Plan
        </div>
      )}
      {!isCurrentPlan && highlighted && (
        <div
          id={`subscription-v2-card-badge-${group.planCode}`}
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-[#3031cb] px-3 py-1 text-xs font-semibold text-white"
        >
          <Sparkles size={11} />
          Most Popular
        </div>
      )}

      <div id={`subscription-v2-card-header-${group.planCode}`}>
        <div className="text-xs text-white/45 uppercase tracking-wider">
          {group.billingCycle.toLowerCase()}
        </div>
        <h3 className="mt-1 text-2xl font-semibold text-white">{group.planName}</h3>
        {group.description && (
          <p className="mt-2 text-sm text-white/55 leading-relaxed line-clamp-2">{group.description}</p>
        )}
      </div>

      <div id={`subscription-v2-card-price-${group.planCode}`} className="mt-6 mb-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-white">
            {formatPrice(headlineMapping.amount, headlineMapping.currencyCode)}
          </span>
          <span className="text-sm text-white/45">/ {billingCycleLabel(group.billingCycle)}</span>
        </div>
      </div>

      {features.length > 0 && (
        <ul
          id={`subscription-v2-card-features-${group.planCode}`}
          className="flex-1 space-y-2.5 text-sm text-white/75 mb-6"
        >
          {features.map(feature => (
            <li key={feature} className="flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {isCurrentPlan ? (
        <button
          id={`subscription-v2-card-cta-${group.planCode}`}
          type="button"
          disabled
          className="w-full rounded-lg py-2.5 text-sm font-semibold border border-emerald-500/30 bg-emerald-500/8 text-emerald-300 cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : hasActiveSubscription ? (
        <button
          id={`subscription-v2-card-cta-${group.planCode}`}
          type="button"
          onClick={() => onSwitchClick(group)}
          disabled={!switchEligible}
          title={switchEligible ? undefined : 'Cannot switch across gateways - cancel current subscription first'}
          className={cn(
            'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors',
            switchEligible
              ? 'bg-white/8 hover:bg-white/12 text-white cursor-pointer'
              : 'bg-white/3 text-white/35 cursor-not-allowed',
          )}
        >
          Switch to this plan
        </button>
      ) : (
        <button
          id={`subscription-v2-card-cta-${group.planCode}`}
          type="button"
          onClick={() => onSubscribeClick(group)}
          className={cn(
            'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer',
            highlighted
              ? 'bg-[#3031cb] hover:bg-[#2626a8] text-white'
              : 'bg-white/8 hover:bg-white/12 text-white',
          )}
        >
          Subscribe
        </button>
      )}
    </div>
  )
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

export function SubscriptionV2Page() {
  const [country, setCountry] = useState(() => detectCountry())
  const currency = useMemo(() => getCurrencyForCountry(country), [country])
  const { plans, isLoading, error, refetch } = usePublicPlans(country, currency)
  const { initiate: initiateCheckout, isLoading: isCheckoutLoading, error: checkoutError } = useCheckout()
  const { subscription, isLoading: isMyLoading, refetch: refetchMe } = useMySubscription()
  const { cancel, isSubmitting: isCancelling } = useCancelSubscription()
  const { changePlan, isSubmitting: isChangingPlan } = useChangePlan()

  const [pendingMappingId, setPendingMappingId] = useState<number | null>(null)
  const [modalGroup, setModalGroup] = useState<PlanGroup | null>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<PlanGroup | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  const planGroups = useMemo(() => groupByPlan(plans), [plans])

  const hasActiveSubscription = subscription !== null
  const currentPlanId = subscription?.subscriptionPlanId ?? null
  const currentGatewayId = subscription?.gatewayId ?? null

  const handleSubscribeClick = (group: PlanGroup) => {
    setModalGroup(group)
  }

  const handleGatewaySelect = (mapping: PublicPlan) => {
    setPendingMappingId(mapping.mappingId)
    initiateCheckout(mapping.planId, mapping.mappingId)
  }

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setModalGroup(null)
      setPendingMappingId(null)
    }
  }

  const handleCancelConfirm = async () => {
    setCancelConfirmOpen(false)
    try {
      await cancel(true)
      setToast({
        open: true,
        title: 'Subscription cancelled',
        description: 'You\'ll keep access until the end of the current billing period.',
        variant: 'success',
      })
      await refetchMe()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to cancel subscription',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const handleSwitchClick = (group: PlanGroup) => {
    if (currentGatewayId === null) return
    const matchingMapping = group.gateways.find(g => g.gatewayId === currentGatewayId)
    if (!matchingMapping) return
    setSwitchTarget(group)
  }

  const handleSwitchConfirm = async () => {
    if (!switchTarget || currentGatewayId === null) return
    const targetMapping = switchTarget.gateways.find(g => g.gatewayId === currentGatewayId)
    setSwitchTarget(null)
    if (!targetMapping) return

    try {
      await changePlan({
        subscriptionPlanId: targetMapping.planId,
        mappingId: targetMapping.mappingId,
        changeAtCycleEnd: true,
      })
      setToast({
        open: true,
        title: 'Plan change scheduled',
        description: `You'll move to ${targetMapping.planName} at your next billing cycle.`,
        variant: 'success',
      })
      await refetchMe()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to change plan',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const countries = useMemo(() => {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return getCountries()
      .map(code => ({ countryCode: code, country: displayNames.of(code) ?? code }))
      .sort((a, b) => a.country.localeCompare(b.country))
  }, [])

  const highlightedIndex = planGroups.length === 3 ? 1 : -1

  return (
    <div id="subscription-v2-page" className="flex h-full flex-col">
      <div
        id="subscription-v2-header"
        className="border-b border-white/6 px-6 py-8 sm:px-10 sm:py-10 shrink-0"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 id="subscription-v2-title" className="text-3xl font-bold text-white sm:text-4xl">
                Plans &amp; Pricing
              </h1>
              <p
                id="subscription-v2-subtitle"
                className="mt-2 text-sm text-white/55 sm:text-base"
              >
                Choose the plan that fits how much you stream and publish.
              </p>
            </div>

            <div id="subscription-v2-region-picker" className="flex items-center gap-2">
              <Globe size={15} className="text-white/45" />
              <span className="text-xs text-white/45">Pricing for</span>
              <select
                id="subscription-v2-country-select"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-sm text-white focus:border-[#3031cb] focus:outline-hidden cursor-pointer"
              >
                {countries.map(c => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.country} ({c.countryCode})
                  </option>
                ))}
              </select>
              {currency && (
                <span className="text-xs text-white/45 font-mono">in {currency}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        id="subscription-v2-content"
        className="flex-1 overflow-y-auto px-6 py-8 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          {!currency && (
            <div
              id="subscription-v2-no-currency"
              className="mx-auto max-w-md rounded-xl border border-amber-500/20 bg-[#1a140a] px-4 py-3 text-sm text-amber-300"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={14} />
                <span>No currency mapped for {country}. Pick a different country.</span>
              </div>
            </div>
          )}

          {currency && isLoading && (
            <div
              id="subscription-v2-loading"
              className="flex items-center justify-center py-20 text-white/45 text-sm"
            >
              <Loader2 size={18} className="animate-spin mr-2" />
              Loading plans...
            </div>
          )}

          {currency && !isLoading && error && (
            <div
              id="subscription-v2-error"
              className="mx-auto max-w-md flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Failed to load plans</div>
                <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
                <button
                  id="subscription-v2-error-retry"
                  type="button"
                  onClick={refetch}
                  className="mt-2 text-xs font-medium text-red-200 hover:text-red-100 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {currency && !isLoading && !error && planGroups.length === 0 && (
            <div
              id="subscription-v2-empty"
              className="mx-auto max-w-md flex flex-col items-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center"
            >
              <div className="text-sm text-white/55">No plans available</div>
              <div className="mt-1 text-xs text-white/35">
                Pricing is not yet configured for {country} / {currency}. Try a different region or contact support.
              </div>
            </div>
          )}

          {subscription && !isMyLoading && (
            <div id="subscription-v2-active-wrap" className="mb-8">
              <ActiveSubscriptionCard
                subscription={subscription}
                isCancelling={isCancelling}
                onCancelClick={() => setCancelConfirmOpen(true)}
                onReactivateClick={() => {}}
              />
            </div>
          )}

          {currency && !isLoading && !error && planGroups.length > 0 && (
            <>
              <div
                id="subscription-v2-grid"
                className={cn(
                  'grid gap-5',
                  planGroups.length === 1 && 'mx-auto max-w-md',
                  planGroups.length === 2 && 'sm:grid-cols-2 mx-auto max-w-3xl',
                  planGroups.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {planGroups.map((group, idx) => (
                  <PlanCard
                    key={group.planId}
                    group={group}
                    highlighted={idx === highlightedIndex}
                    isCurrentPlan={group.planId === currentPlanId}
                    hasActiveSubscription={hasActiveSubscription}
                    currentGatewayId={currentGatewayId}
                    onSubscribeClick={handleSubscribeClick}
                    onSwitchClick={handleSwitchClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <GatewayPickerModal
        open={modalGroup !== null}
        onOpenChange={handleModalOpenChange}
        group={modalGroup}
        isSubscribing={isCheckoutLoading}
        pendingMappingId={pendingMappingId}
        error={checkoutError}
        onSelect={handleGatewaySelect}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel subscription?"
        description={
          subscription
            ? `You'll keep access to ${subscription.planName} until your current period ends. You won't be charged again.`
            : undefined
        }
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        variant="danger"
        onConfirm={handleCancelConfirm}
      />

      <ConfirmDialog
        open={switchTarget !== null}
        onOpenChange={open => !open && setSwitchTarget(null)}
        title={`Switch to ${switchTarget?.planName ?? 'this plan'}?`}
        description="The plan change will take effect at the start of your next billing cycle. You'll keep your current plan until then."
        confirmLabel="Switch plan"
        confirmDisabled={isChangingPlan}
        onConfirm={handleSwitchConfirm}
      />

      <Toaster
        id="subscription-v2-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
