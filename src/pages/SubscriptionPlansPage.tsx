import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check, Loader2, Zap, PackageX, X,
  CalendarClock, BadgeCheck, Ban, CreditCard,
  AlertCircle, ExternalLink,
} from 'lucide-react'
import { http } from '../lib/http'
import { apiConfig } from '../lib/apiConfig'
import { getStorage } from '../lib/storage'
import { Toaster } from '../components/ui/Toast'
import { cn } from '../lib/utils'
import type {
  Plan, SubscriptionPlansResponse,
  SubscriptionInvoice, SubscriptionResponse,
  RecurlyAccount, RecurlyAccountResponse,
} from '../types/subscriptionPlan'
import type { UserData } from '../types/user'

// ── Constants ─────────────────────────────────────────────────────────────────

const API = apiConfig.dotnetApiBase
const RECURLY_BASE = 'https://videograph-test.recurly.com/subscribe'
const HIGHLIGHTED_PLAN = 'pcr-enterprise-90h'

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchPlans(product = 'pcr'): Promise<Plan[]> {
  const res = await http.get<SubscriptionPlansResponse>(API, `v1/recurly/subscriptionplans?product=${product}`)
  if (res.code !== 1) throw new Error(res.Message)
  return res.data
}

async function fetchSubscription(gatewayId: string): Promise<SubscriptionInvoice | null> {
  const res = await http.get<SubscriptionResponse>(API, `v1/recurly/subscription/${gatewayId}`)
  if (res.code !== 1 || !res.data?.length) return null
  return res.data[0]
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

function billingLabel(length: number, unit: string) {
  return length === 1 ? 'Monthly' : `Every ${length} ${unit}`
}

function pricePerMonth(amount: number, length: number): string | null {
  return length > 1 ? `${formatPrice(Math.round(amount / length), 'USD')} / mo` : null
}

function buildRecurlyUrl(planCode: string, account: RecurlyAccount, accountCode: string): string {
  const params = new URLSearchParams({
    currency: 'USD',
    first_name: account.first_name,
    last_name: account.last_name,
    email: account.email,
    account_code: accountCode,
    existing_account: 'true',
  })
  return `${RECURLY_BASE}/${planCode}?${params.toString()}`
}

// ── CancelDialog ──────────────────────────────────────────────────────────────

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
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-200" />
        <Dialog.Content className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
          'bg-white border border-black/10 rounded-2xl shadow-lg p-6',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-200 origin-center',
        )}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
                <AlertCircle size={16} className="text-red-400" />
              </span>
              <div>
                <Dialog.Title className="text-sm font-semibold text-white">Cancel Subscription</Dialog.Title>
                <Dialog.Description className="text-xs text-white/40 mt-0.5">{planName}</Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none ml-4">
              <X size={16} />
            </Dialog.Close>
          </div>

          <p className="text-sm text-white/55 mb-4 leading-relaxed">
            Are you sure you want to cancel? You'll retain access until the end of your current billing period.
          </p>

          <label className="block text-xs font-medium text-white/50 mb-1.5">
            Reason <span className="text-white/25">(optional)</span>
          </label>
          <textarea
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
            <Dialog.Close className="px-4 py-2 rounded-lg text-sm font-medium text-white/55 cursor-pointer hover:bg-white/5 hover:text-white/80 transition-colors border border-white/8 outline-none">
              Keep Plan
            </Dialog.Close>
            <button
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: Plan
  highlighted: boolean
  isActive: boolean
  isSubscribed: boolean
  subscribing: boolean
  onSubscribe: () => void
  onCancel: () => void
}

function PlanCard({ plan, highlighted, isActive, isSubscribed, subscribing, onSubscribe, onCancel }: PlanCardProps) {
  const currency = plan.currencies[0]
  const isAnnual = plan.interval_length > 1

  const features = useMemo(
    () => plan.description.split(',').map((f) => f.trim()).filter(Boolean),
    [plan.description],
  )
  const formattedPrice = useMemo(
    () => formatPrice(currency.unit_amount, currency.currency),
    [currency.unit_amount, currency.currency],
  )
  const perMonth = useMemo(
    () => pricePerMonth(currency.unit_amount, plan.interval_length),
    [currency.unit_amount, plan.interval_length],
  )

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border p-5 transition-all duration-200',
      isActive
        ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.07)]'
        : highlighted
          ? 'border-[#3031cb]/40 bg-[#3031cb]/5 shadow-[0_0_40px_rgba(48,49,203,0.07)]'
          : 'border-white/8 bg-white/3 hover:border-white/14 hover:bg-white/5',
    )}>
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide uppercase whitespace-nowrap">
            <BadgeCheck size={10} /> Current Plan
          </span>
        </div>
      )}
      {!isActive && highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide uppercase">
            <Zap size={10} /> Popular
          </span>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className={cn(
          'text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border',
          isAnnual ? 'text-cyan-400/80 border-cyan-400/20 bg-cyan-400/5' : 'text-white/40 border-white/10 bg-white/3',
        )}>
          {billingLabel(plan.interval_length, plan.interval_unit)}
        </span>
        {plan.state === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" title="Active" />}
      </div>

      <h3 className="text-sm font-semibold text-white tracking-tight">{plan.name}</h3>

      <div className="mt-3 mb-5">
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

      {isActive ? (
        <button
          type="button"
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 transition-all duration-200"
        >
          <Ban size={13} /> Cancel Plan
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubscribe}
          disabled={isSubscribed || subscribing}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200',
            highlighted
              ? 'bg-[#3031cb] hover:bg-[#2829b0] text-white'
              : 'bg-white/6 hover:bg-white/10 text-white/70 hover:text-white border border-white/8',
            (isSubscribed || subscribing) && 'opacity-40 cursor-not-allowed',
          )}
        >
          {subscribing ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
          Get Started
        </button>
      )}
    </div>
  )
}

// ── Toast state helper ────────────────────────────────────────────────────────

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [user] = useState(() => getStorage<UserData>('pcr_user'))
  const [channelId] = useState(() => getStorage<string>('pcr_channel_id') ?? '')
  const [channelName] = useState(() => getStorage<string>('pcr_channel_name') ?? '')
  const gatewayId = `${channelName}_${channelId}`
  const redirectFromRef = useRef(searchParams.get('redirectfrom'))

  const [plans, setPlans] = useState<Plan[]>([])
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'error' })

  const showToast = useCallback((title: string, description?: string, variant: 'error' | 'success' = 'error') => {
    setToast({ open: true, title, description, variant })
  }, [])

  const refreshSubscription = useCallback(async () => {
    const sub = await fetchSubscription(gatewayId).catch(() => null)
    setInvoice(sub)
  }, [gatewayId])

  useEffect(() => {
    document.title = 'CloudReel – My Subscription'
    let cancelled = false

    async function init() {
      setLoading(true)
      const [plansResult, subResult] = await Promise.allSettled([
        fetchPlans(),
        fetchSubscription(gatewayId),
      ])
      if (cancelled) return

      if (plansResult.status === 'fulfilled') setPlans(plansResult.value)
      else showToast('Failed to load plans', 'Could not fetch subscription plans. Please try again.')

      const sub = subResult.status === 'fulfilled' ? subResult.value : null
      setInvoice(sub)
      setLoading(false)

      if (redirectFromRef.current && sub && user) {
        await registerPayment(sub, gatewayId, user.id, channelId).catch(() => null)
        navigate('/subscription-plans', { replace: true })
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
    setSubscribingPlanId(plan.id)
    try {
      const account = await ensureAccount(gatewayId, channelName, channelId)
      window.location.href = buildRecurlyUrl(plan.code, account, gatewayId)
    } catch {
      showToast('Checkout failed', 'Could not initiate checkout. Please try again.')
      setSubscribingPlanId(null)
    }
  }, [gatewayId, channelId, channelName, showToast])

  const handleCancelConfirm = useCallback(async (remarks: string) => {
    if (!invoice || !user) return
    setCanceling(true)
    try {
      const qs = new URLSearchParams({
        gatewayId,
        invoiceNumber: invoice.invoiceNumber,
        userId: String(user.id),
        remarks,
      })
      const res = await http.delete<{ code: number; Message: string }>(
        API,
        `v1/recurly/cancel-subscription/${invoice.subscription.id}?${qs.toString()}`,
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
  }, [invoice, user, gatewayId, refreshSubscription, showToast])

  const activePlanCode = invoice?.subscription?.state === 'active' ? invoice.subscription.plan.code : null
  const isSubscribed = activePlanCode !== null
  const expiryDate = invoice?.subscription?.current_period_ends_at

  return (
    <div className="flex h-full flex-col">
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
                <p className="text-sm text-white/35">Manage your plan. Upgrade or cancel anytime.</p>
              </div>

              {expiryDate && (
                <div className="flex items-center gap-2.5 rounded-lg bg-amber-400/8 border border-amber-400/15 px-3 py-2 shrink-0">
                  <CalendarClock size={13} className="text-amber-400/70 shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider leading-none mb-0.5">
                      Renews
                    </p>
                    <p className="text-xs font-semibold text-amber-400/90">
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

          {/* Plans grid */}
          {!loading && plans.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    highlighted={plan.code === HIGHLIGHTED_PLAN}
                    isActive={plan.code === activePlanCode}
                    isSubscribed={isSubscribed}
                    subscribing={subscribingPlanId === plan.id}
                    onSubscribe={() => handleSubscribe(plan)}
                    onCancel={() => setCancelOpen(true)}
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
        planName={invoice?.subscription?.plan?.name ?? ''}
      />

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
