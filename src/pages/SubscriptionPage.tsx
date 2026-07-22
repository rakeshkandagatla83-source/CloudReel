import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check, Loader2, Zap, PackageX, X,
  CalendarClock, BadgeCheck, Ban, CreditCard,
  AlertCircle, ExternalLink, Info,
} from 'lucide-react'
import { http } from '../lib/http'
import { apiConfig } from '../lib/apiConfig'
import { getStorage } from '../lib/storage'
import { Toaster } from '../components/ui/Toast'
import { UsageCard } from '../components/ui/UsageCard'
import { cn } from '../lib/utils'
import { PLAN_LIMITS, TRIAL_PLAN_LIMITS } from '../lib/planLimits'
import { TrialQuotasModal } from '../components/ui/TrialQuotasModal'
import { useSubscription } from '../features/subscription/useSubscription'
import { useMeetingHoursUsage } from '../features/subscription/useMeetingHoursUsage'
import { usePublishUsage } from '../features/subscription/usePublishUsage'
import type {
  Plan, SubscriptionPlansResponse,
  SubscriptionInvoice,
  RecurlyAccount, RecurlyAccountResponse,
} from '../types/subscriptionPlan'
import type { UserData } from '../types/user'

const API = apiConfig.dotnetApiBase
const RECURLY_BASE = 'https://videograph-test.recurly.com/subscribe'
const HIGHLIGHTED_PLAN = 'pcr-basic-60h'
const RECURLY_TRIAL_DAYS = 7
const RECURLY_TRIAL_COUPON_CODE = 'pcr_trial_7d'

async function fetchPlans(product = 'pcr'): Promise<Plan[]> {
  const res = await http.get<SubscriptionPlansResponse>(API, `v1/recurly/subscriptionplans?product=${product}`)
  if (res.code !== 1) throw new Error(res.Message)
  return res.data
}


async function ensureAccount(gatewayId: string, cName: string, cid: string): Promise<RecurlyAccount> {
  await http.post(API, 'v1/recurly/add-account', {
    code: gatewayId,
    first_name: cName,
    last_name: cid,
    email: 'test@gmail.com',
  })
  const res = await http.get<RecurlyAccountResponse>(API, `v1/recurly/accounts/${gatewayId}`)
  return res.data
}

async function registerPayment(
  invoice: SubscriptionInvoice,
  gatewayId: string,
  userId: number,
  cid: string,
): Promise<void> {
  const { subscription, invoiceNumber } = invoice
  const planStartDate = Math.floor(new Date(subscription.current_term_started_at).getTime() / 1000)
  const planEndDate = Math.floor(new Date(subscription.current_term_ends_at).getTime() / 1000)
  const base = {
    id: 0, cid, gatewayId, gatewayType: 'Recurly', userId,
    planName: subscription.plan.name, planStartDate, planEndDate, planCancelDate: 0,
  }
  await Promise.allSettled([
    http.post(API, 'v1/recurly/upsert-paymentdetails', base),
    http.post(API, 'v1/recurly/insert-paymenthistory', {
      ...base, cancelUserId: 0, invoiceNumber, cancelTransaction: 0, remarks: '',
    }),
  ])
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

function billingLabel(length: number, unit: string) {
  return length === 1 ? 'Monthly' : `Every ${length} ${unit}`
}

function pricePerMonth(amount: number, length: number): string | null {
  return length > 1 ? `${formatPrice(Math.round(amount / length), 'USD')} / mo` : null
}

function buildRecurlyUrl(planCode: string, account: RecurlyAccount, accountCode: string, hasClaimedTrial: boolean = false): string {
  const params = new URLSearchParams({
    currency: 'USD',
    first_name: account.first_name,
    last_name: account.last_name,
    email: account.email,
    account_code: accountCode,
    existing_account: 'true',
  })
  const couponSuffix = !hasClaimedTrial ? `&subscription[coupon_code]=${RECURLY_TRIAL_COUPON_CODE}` : ''
  return `${RECURLY_BASE}/${planCode}?${params.toString()}${couponSuffix}`
}

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (remarks: string) => void
  loading: boolean
  planName: string
}

function CancelDialog({ open, onOpenChange, onConfirm, loading, planName }: CancelDialogProps) {
  const [remarks, setRemarks] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) setRemarks('')
    onOpenChange(next)
  }

  return (
    <div hidden={!open}>
      {open && (
        <div
          id="subscription-cancel-overlay"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => handleOpenChange(false)}
        />
      )}
      {open && (
        <div
          id="subscription-cancel-dialog"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'bg-secondary-bg border border-white/10 rounded-2xl shadow-2xl p-6',
          )}
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
                <AlertCircle size={16} className="text-red-400" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">Cancel Subscription</h2>
                <p className="text-xs text-white/40 mt-0.5">{planName}</p>
              </div>
            </div>
            <button
              id="subscription-cancel-close"
              type="button"
              onClick={() => handleOpenChange(false)}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none ml-4"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-white/55 mb-4 leading-relaxed">
            Are you sure you want to cancel? You'll retain access until the end of your current billing period.
          </p>

          <label className="block text-xs font-medium text-white/50 mb-1.5">
            Reason <span className="text-white/25">(optional)</span>
          </label>
          <textarea
            id="subscription-cancel-remarks"
            className={cn(
              'w-full h-20 rounded-lg bg-white/4 border border-white/8 px-3 py-2.5 resize-none outline-none',
              'text-sm text-white/80 placeholder:text-white/20',
              'focus:border-white/20 focus:bg-white/5 transition-colors',
            )}
            placeholder="Let us know why you're leaving…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <div className="flex gap-2.5 mt-5 justify-end">
            <button
              id="subscription-cancel-keep"
              type="button"
              onClick={() => handleOpenChange(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/55 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors border border-white/8 outline-none"
            >
              Keep Plan
            </button>
            <button
              id="subscription-cancel-confirm"
              type="button"
              onClick={() => onConfirm(remarks)}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer',
                'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-colors',
                loading && 'opacity-60 cursor-not-allowed',
              )}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
              Cancel Subscription
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface DowngradeWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  loading: boolean
  currentPlanName: string
  newPlanName: string
}

function DowngradeWarningDialog({ open, onOpenChange, onConfirm, loading, currentPlanName, newPlanName }: DowngradeWarningDialogProps) {
  return (
    <div hidden={!open}>
      {open && (
        <div
          id="subscription-downgrade-overlay"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}
      {open && (
        <div
          id="subscription-downgrade-dialog"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'bg-secondary-bg border border-white/10 rounded-2xl shadow-2xl p-6',
          )}
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                <AlertCircle size={16} className="text-amber-400" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">Downgrade Plan?</h2>
                <p className="text-xs text-white/40 mt-0.5">You're about to reduce your features</p>
              </div>
            </div>
            <button
              id="subscription-downgrade-close"
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none ml-4"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-white/55 mb-4 leading-relaxed">
            You're downgrading from <span className="font-semibold text-white">{currentPlanName}</span> to <span className="font-semibold text-white">{newPlanName}</span>. You'll have reduced meeting hours, publishing hours, and upload limits.
          </p>

          <p className="text-xs text-white/40 mb-5">
            The change will take effect immediately for your next billing period.
          </p>

          <div className="flex gap-2.5 justify-end">
            <button
              id="subscription-downgrade-cancel"
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/55 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors border border-white/8 outline-none"
            >
              Keep Current Plan
            </button>
            <button
              id="subscription-downgrade-confirm"
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer',
                'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 transition-colors',
                loading && 'opacity-60 cursor-not-allowed',
              )}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Confirm Downgrade
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlanCardProps {
  plan: Plan
  highlighted: boolean
  isActive: boolean
  isSubscribed: boolean
  subscribing: boolean
  isTrialing: boolean
  hasClaimedTrial: boolean
  isCancelled: boolean
  onSubscribe: () => void
  onCancel: () => void
  onTrialInfoClick?: () => void
}

function PlanCard({ plan, highlighted, isActive, isSubscribed, subscribing, isTrialing, hasClaimedTrial, isCancelled, onSubscribe, onCancel, onTrialInfoClick }: PlanCardProps) {
  const currency = plan.currencies[0]
  const isAnnual = plan.interval_length > 1
  const hasTrial = RECURLY_TRIAL_DAYS > 0 && !isTrialing && !hasClaimedTrial

  const planCode = plan.code as keyof typeof PLAN_LIMITS
  const planLimits = PLAN_LIMITS[planCode]

  const features = useMemo(() => {
    if (!planLimits) return []
    return [
      `${planLimits.maxMeetingHours} Hours - Live meetings`,
      `${planLimits.maxMeetingHours} Hours - Go Live simultaneously on ${planLimits.maxPlatforms} ${planLimits.maxPlatforms === 1 ? 'Platform' : 'Platforms'}`,
      `${planLimits.maxUploads} - Uploads to Platforms`,
    ]
  }, [planLimits])
  const formattedPrice = useMemo(
    () => formatPrice(currency.unit_amount, currency.currency),
    [currency.unit_amount, currency.currency],
  )
  const perMonth = useMemo(
    () => pricePerMonth(currency.unit_amount, plan.interval_length),
    [currency.unit_amount, plan.interval_length],
  )

  return (
    <div
      id={`plan-card-${plan.code}`}
      className={cn(
        'relative flex flex-col rounded-2xl border p-5 transition-all duration-200',
        isActive
          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.07)]'
          : highlighted
            ? 'border-[#3031cb]/40 bg-[#3031cb]/5 shadow-[0_0_40px_rgba(48,49,203,0.07)]'
            : 'border-white/8 bg-white/3 hover:border-white/14 hover:bg-white/5',
      )}
    >
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide uppercase whitespace-nowrap">
            <BadgeCheck size={10} /> Current Plan
          </span>
        </div>
      )}
      {!isActive && highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3031cb] px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide uppercase">
            <Zap size={10} /> Popular
          </span>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border',
            isAnnual ? 'text-cyan-400/80 border-cyan-400/20 bg-cyan-400/5' : 'text-white/40 border-white/10 bg-white/3',
          )}>
            {billingLabel(plan.interval_length, plan.interval_unit)}
          </span>
          {hasTrial && (
            <button
              id={`trial-info-btn-${plan.code}`}
              type="button"
              onClick={onTrialInfoClick}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 cursor-pointer transition-colors outline-none group"
              title="Click to see trial quotas"
            >
              <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wide">
                {RECURLY_TRIAL_DAYS}d trial
              </span>
              <Info size={12} className="text-green-400 group-hover:text-green-300 transition-colors" />
            </button>
          )}
        </div>
        {plan.state === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shrink-0" title="Active" />}
      </div>

      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">{plan.name}</h3>
        {planLimits && <p className="text-xs text-white/40 mt-1">{planLimits.tagline}</p>}
      </div>

      <div className="mb-5">
        <span className="text-3xl font-bold text-white">{formattedPrice}</span>
        <span className="ml-1.5 text-sm text-white/35">/ {isAnnual ? 'yr' : 'mo'}</span>
        {perMonth && <p className="mt-1 text-[11px] text-white/30 font-mono">{perMonth} billed annually</p>}
      </div>

      <ul className="flex-1 space-y-2 mb-5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check size={12} className="shrink-0 mt-0.5 text-emerald-400/80" />
            <span className="text-xs text-white/55 leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {isActive && !isCancelled ? (
        <button
          id={`plan-cancel-btn-${plan.code}`}
          type="button"
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 transition-all duration-200"
        >
          <Ban size={13} /> Cancel Plan
        </button>
      ) : isActive ? (
        <button
          id={`plan-cancelled-badge-${plan.code}`}
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold cursor-not-allowed bg-red-500/5 text-red-300 border border-red-500/15 opacity-60"
        >
          <Ban size={13} /> Subscription Cancelled
        </button>
      ) : (
        <button
          id={`plan-subscribe-btn-${plan.code}`}
          type="button"
          onClick={onSubscribe}
          disabled={subscribing}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200',
            highlighted
              ? 'bg-[#3031cb] hover:bg-[#2626a8] text-white'
              : 'bg-white/6 hover:bg-white/10 text-white/70 hover:text-white border border-white/8',
            subscribing && 'opacity-40 cursor-not-allowed',
          )}
        >
          {subscribing ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
          {isSubscribed ? 'Change Plan' : (hasTrial ? 'Start Free Trial' : 'Get Started')}
        </button>
      )}
    </div>
  )
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success'
}

export function SubscriptionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSubscribed, billingPeriodEnd, invoice: contextInvoice, refetch: refetchSubscription, isTrialing, trialEndsAt, hasClaimedTrial } = useSubscription()
  const meetingHours = useMeetingHoursUsage()
  const { uploads, publishingHours, loading: publishUsageLoading } = usePublishUsage()

  const [user] = useState(() => getStorage<UserData>('pcr_user'))
  const [channelId] = useState(() => getStorage<string>('pcr_channel_id') ?? '')
  const [channelName] = useState(() => getStorage<string>('pcr_channel_name') ?? '')
  const gatewayId = `${channelName}_${channelId}`
  const redirectFromRef = useRef(searchParams.get('redirectfrom'))

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [selectedPlanForTrial, setSelectedPlanForTrial] = useState<Plan | null>(null)
  const [downgradeWarningOpen, setDowngradeWarningOpen] = useState(false)
  const [pendingPlanChange, setPendingPlanChange] = useState<Plan | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'error' })

  const showToast = useCallback((title: string, description?: string, variant: 'error' | 'success' = 'error') => {
    setToast({ open: true, title, description, variant })
  }, [])

  // Calculate derived state early so it's available to callbacks
  const subState = contextInvoice?.subscription?.state
  const expiresAt = contextInvoice?.subscription?.expires_at ? new Date(contextInvoice.subscription.expires_at) : null
  const isExpired = expiresAt ? expiresAt <= new Date() : true
  const activePlanCode = (subState === 'active' || (subState === 'canceled' && !isExpired)) ? contextInvoice?.subscription?.plan?.code : null
  const expiryDate = contextInvoice?.subscription?.current_period_ends_at

  const refreshSubscription = useCallback(async () => {
    await refetchSubscription()
  }, [refetchSubscription])

  useEffect(() => {
    document.title = 'CloudReel – My Subscription'
    let cancelled = false

    async function init() {
      setLoading(true)
      try {
        const plans = await fetchPlans()
        if (cancelled) return
        setPlans(plans)

        if (redirectFromRef.current && user) {
          const subRes = await http.get<{ code: number; data: SubscriptionInvoice[] }>(
            API,
            `v1/recurly/subscription/${gatewayId}`,
          ).catch(() => null)
          const freshInvoice = subRes?.code === 1 && subRes.data?.length ? subRes.data[0] : null
          if (freshInvoice) {
            await registerPayment(freshInvoice, gatewayId, user.id, channelId).catch(() => null)
          }
          navigate('/subscription', { replace: true })
        }
      } catch {
        if (cancelled) return
        showToast('Failed to load plans', 'Could not fetch subscription plans. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubscribe = useCallback(async (plan: Plan) => {
    if (!channelId || !channelName) {
      showToast('No channel selected', 'Please select a channel before subscribing.')
      return
    }

    const isChangingPlan = isSubscribed && activePlanCode && activePlanCode !== plan.code

    // Check if this is a downgrade (only if already subscribed and changing plans)
    if (isChangingPlan) {
      const currentPlanLimits = PLAN_LIMITS[activePlanCode as keyof typeof PLAN_LIMITS]
      const newPlanLimits = PLAN_LIMITS[plan.code as keyof typeof PLAN_LIMITS]

      const isDowngrade = currentPlanLimits && newPlanLimits && (
        newPlanLimits.maxMeetingHours < currentPlanLimits.maxMeetingHours ||
        newPlanLimits.maxPublishingHours < currentPlanLimits.maxPublishingHours ||
        newPlanLimits.maxUploads < currentPlanLimits.maxUploads
      )

      if (isDowngrade) {
        setPendingPlanChange(plan)
        setDowngradeWarningOpen(true)
        return
      }
    }

    setSubscribingPlanId(plan.id)
    try {
      // Plan change: update existing subscription via backend API
      if (isChangingPlan && contextInvoice?.subscription?.id) {
        const res = await http.post<{ code: number; Message: string }>(
          API,
          `v1/recurly/update-subscription/${contextInvoice.subscription.id}`,
          { planCode: plan.code },
        )
        if (res.code !== 1) throw new Error(res.Message)
        await refreshSubscription()
        setSubscribingPlanId(null)
        showToast('Plan updated', 'Your plan will change on the next billing cycle.', 'success')
      } else {
        // New subscription: redirect to Recurly checkout
        const account = await ensureAccount(gatewayId, channelName, channelId)
        window.location.href = buildRecurlyUrl(plan.code, account, gatewayId, hasClaimedTrial)
      }
    } catch {
      const message = isChangingPlan ? 'Plan change failed' : 'Checkout failed'
      const description = isChangingPlan ? 'Could not update your plan. Please try again.' : 'Could not initiate checkout. Please try again.'
      showToast(message, description)
      setSubscribingPlanId(null)
    }
  }, [gatewayId, channelId, channelName, hasClaimedTrial, showToast, isSubscribed, activePlanCode, contextInvoice?.subscription?.id, refreshSubscription])

  const handleTrialInfoClick = useCallback((plan: Plan) => {
    setSelectedPlanForTrial(plan)
    setTrialModalOpen(true)
  }, [])

  const handleCancelConfirm = useCallback(async (remarks: string) => {
    if (!contextInvoice || !user) return
    setCanceling(true)
    try {
      const qs = new URLSearchParams({
        gatewayId,
        invoiceNumber: contextInvoice.invoiceNumber,
        userId: String(user.id),
        remarks,
      })
      const res = await http.delete<{ code: number; Message: string }>(
        API,
        `v1/recurly/cancel-subscription/${contextInvoice.subscription.id}?${qs.toString()}`,
      )
      if (res.code !== 1) throw new Error(res.Message)
      await refreshSubscription()
      setCancelOpen(false)
      showToast('Subscription cancelled', 'Your plan has been cancelled. Access continues until the period ends.', 'success')
    } catch {
      showToast('Cancel failed', 'Could not cancel subscription. Please try again.')
    } finally {
      setCanceling(false)
    }
  }, [contextInvoice, user, gatewayId, refreshSubscription, showToast])

  const handleDowngradeConfirm = useCallback(async () => {
    if (!pendingPlanChange || !contextInvoice?.subscription?.id) return
    setSubscribingPlanId(pendingPlanChange.id)
    try {
      const res = await http.post<{ code: number; Message: string }>(
        API,
        `v1/recurly/update-subscription/${contextInvoice.subscription.id}`,
        { planCode: pendingPlanChange.code },
      )
      if (res.code !== 1) throw new Error(res.Message)
      await refreshSubscription()
      setDowngradeWarningOpen(false)
      setPendingPlanChange(null)
      setSubscribingPlanId(null)
      showToast('Plan downgraded', 'Your plan will change on the next billing cycle.', 'success')
    } catch {
      showToast('Downgrade failed', 'Could not downgrade your plan. Please try again.')
      setSubscribingPlanId(null)
    }
  }, [pendingPlanChange, contextInvoice?.subscription?.id, refreshSubscription, showToast])

  return (
    <div id="subscription-page" className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <CreditCard size={16} className="text-[#3031cb]" />
                  <h1 className="text-lg font-semibold text-white tracking-tight">My Subscription</h1>
                </div>
                <p className="text-sm text-white/35">
                  {isSubscribed && subState === 'canceled'
                    ? 'Your subscription will expire on the date shown above. You can reactivate anytime.'
                    : isSubscribed
                      ? 'Manage your plan. Upgrade or cancel anytime.'
                      : 'Start your free trial. Credit card required, no charge until trial ends.'}
                </p>
              </div>

              {expiryDate && (
                <div className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2 shrink-0',
                  subState === 'canceled'
                    ? 'bg-red-500/8 border-red-500/15'
                    : 'bg-amber-400/8 border-amber-400/15',
                )}>
                  <CalendarClock size={13} className={cn(
                    'shrink-0',
                    subState === 'canceled' ? 'text-red-400/70' : 'text-amber-400/70',
                  )} />
                  <div>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider leading-none mb-0.5">
                      {subState === 'canceled' ? 'Expires' : 'Renews'}
                    </p>
                    <p className={cn(
                      'text-xs font-semibold',
                      subState === 'canceled' ? 'text-red-400/90' : 'text-amber-400/90',
                    )}>
                      {new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 h-px bg-white/6" />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24 gap-2.5 text-white/30">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-mono">Loading plans…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && plans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/25">
              <PackageX size={36} strokeWidth={1.2} />
              <span className="text-sm">No subscription plans available.</span>
            </div>
          )}

          {/* Usage cards (if subscribed) */}
          {!loading && isSubscribed && (
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-white mb-4">Usage This Period</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UsageCard
                  id="usage-card-meeting-hours"
                  title="Meeting Hours"
                  used={meetingHours.hoursUsed}
                  limit={meetingHours.limit}
                  unit="hours"
                  billingPeriodEnd={billingPeriodEnd}
                  loading={meetingHours.loading}
                  isTrialing={isTrialing}
                  trialEndsAt={trialEndsAt}
                />
                <UsageCard
                  id="usage-card-publishing-hours"
                  title="Publishing Hours"
                  used={publishingHours.hoursUsed}
                  limit={publishingHours.limit}
                  unit="hours"
                  billingPeriodEnd={billingPeriodEnd}
                  loading={publishUsageLoading}
                  isTrialing={isTrialing}
                  trialEndsAt={trialEndsAt}
                />
                <UsageCard
                  id="usage-card-uploads"
                  title="Uploads"
                  used={uploads.used}
                  limit={uploads.limit}
                  unit="uploads"
                  billingPeriodEnd={billingPeriodEnd}
                  loading={publishUsageLoading}
                  isTrialing={isTrialing}
                  trialEndsAt={trialEndsAt}
                />
              </div>
            </div>
          )}

          {/* Trial info banner - only for users with NO subscription and haven't claimed trial yet */}
          {!loading && !isSubscribed && !hasClaimedTrial && plans.length > 0 && RECURLY_TRIAL_DAYS > 0 && (() => {
            const allPlansHaveTrial = true
            return (
              <div className="mb-8 rounded-lg bg-green-500/8 border border-green-500/20 p-4">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-green-400">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-400 mb-1">Start your free trial today</p>
                    <p className="text-xs text-white/55">
                      {allPlansHaveTrial
                        ? 'All plans include a free trial period. Credit card is required to start, but you won\'t be charged until your trial ends.'
                        : 'Select a plan with a free trial period below. Credit card is required to start, but you won\'t be charged until your trial ends.'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Plans grid */}
          {!loading && plans.length > 0 && (
            <>
              <div id="subscription-plans-section">
                {isSubscribed && (
                  <h2 className="text-sm font-semibold text-white mb-4">Explore Plans</h2>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    highlighted={plan.code === HIGHLIGHTED_PLAN}
                    isActive={plan.code === activePlanCode}
                    isSubscribed={Boolean(activePlanCode)}
                    subscribing={subscribingPlanId === plan.id}
                    isTrialing={isTrialing}
                    hasClaimedTrial={hasClaimedTrial}
                    isCancelled={subState === 'canceled'}
                    onSubscribe={() => handleSubscribe(plan)}
                    onCancel={() => setCancelOpen(true)}
                    onTrialInfoClick={() => handleTrialInfoClick(plan)}
                  />
                ))}
              </div>
              {isSubscribed && (
                <p className="mt-8 text-center text-[11px] text-white/20 font-mono">
                  You have an active subscription. You can cancel from your current plan card above.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancelConfirm}
        loading={canceling}
        planName={contextInvoice?.subscription?.plan?.name ?? ''}
      />

      <DowngradeWarningDialog
        open={downgradeWarningOpen}
        onOpenChange={setDowngradeWarningOpen}
        onConfirm={handleDowngradeConfirm}
        loading={subscribingPlanId !== null}
        currentPlanName={contextInvoice?.subscription?.plan?.name ?? ''}
        newPlanName={pendingPlanChange?.name ?? ''}
      />

      {selectedPlanForTrial && (() => {
        const planCode = selectedPlanForTrial.code as keyof typeof TRIAL_PLAN_LIMITS
        const trialLimits = TRIAL_PLAN_LIMITS[planCode]
        const fullLimits = PLAN_LIMITS[planCode]

        const quotas = [
          { label: 'Meeting Hours', trial: trialLimits.maxMeetingHours, full: fullLimits.maxMeetingHours, unit: 'hours' },
          { label: 'Publishing Hours', trial: trialLimits.maxPublishingHours, full: fullLimits.maxPublishingHours, unit: 'hours' },
          { label: 'Platform Uploads', trial: trialLimits.maxUploads, full: fullLimits.maxUploads, unit: 'uploads' },
          { label: 'Simultaneous Platforms', trial: trialLimits.maxPlatforms, full: fullLimits.maxPlatforms, unit: 'platforms' },
        ]

        return (
          <TrialQuotasModal
            id="trial-quotas-modal"
            open={trialModalOpen}
            onOpenChange={setTrialModalOpen}
            planName={selectedPlanForTrial.name}
            trialDays={selectedPlanForTrial.trial_length}
            quotas={quotas}
          />
        )
      })()}

      <Toaster
        open={toast.open}
        onOpenChange={(open) => setToast((t) => ({ ...t, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
