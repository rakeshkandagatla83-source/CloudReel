import { CheckCircle2, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { epochToLocalDate } from '../../lib/dateUtils'
import { formatPrice, billingCycleLabel } from './format'
import type { CurrentSubscription } from '../../types/subscriptionV2'

interface ActiveSubscriptionCardProps {
  subscription: CurrentSubscription
  isCancelling: boolean
  onCancelClick: () => void
  onReactivateClick?: () => void
}

export function ActiveSubscriptionCard({
  subscription,
  isCancelling,
  onCancelClick,
  onReactivateClick,
}: ActiveSubscriptionCardProps) {
  const isCancelled = subscription.status === 'cancelled'
  const isTrialing = subscription.status === 'trialing'
  const periodEndLabel = epochToLocalDate(subscription.currentPeriodEndsAt)

  const statusLabel = isCancelled
    ? `Cancels on ${periodEndLabel}`
    : isTrialing
      ? `Trial ends on ${periodEndLabel}`
      : `Renews on ${periodEndLabel}`

  const statusTone = isCancelled
    ? 'amber'
    : isTrialing
      ? 'blue'
      : 'emerald'

  return (
    <div
      id="subscription-v2-active-card"
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-secondary-bg',
        'shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]',
        isCancelled ? 'border-amber-500/30' : 'border-emerald-500/30',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent',
          isCancelled ? 'via-amber-400/60' : 'via-emerald-400/60',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b to-transparent',
          isCancelled ? 'from-amber-400/8' : 'from-emerald-400/8',
        )}
      />

      <div
        id="subscription-v2-active-card-content"
        className="relative flex flex-col gap-6 px-7 py-7 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex-1 min-w-0">
          <div
            id="subscription-v2-active-card-eyebrow"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              statusTone === 'emerald' && 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300',
              statusTone === 'amber' && 'border-amber-500/25 bg-amber-500/8 text-amber-300',
              statusTone === 'blue' && 'border-sky-500/25 bg-sky-500/8 text-sky-300',
            )}
          >
            {statusTone === 'amber' ? <X size={11} strokeWidth={2.5} /> : <ShieldCheck size={11} strokeWidth={2.5} />}
            <span>Your subscription</span>
          </div>

          <h2
            id="subscription-v2-active-card-name"
            className="mt-3 text-3xl font-semibold tracking-tight text-white"
          >
            {subscription.planName}
          </h2>

          <div
            id="subscription-v2-active-card-meta"
            className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            {subscription.amount != null && subscription.currencyCode && (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums text-white">
                  {formatPrice(subscription.amount, subscription.currencyCode)}
                </span>
                <span className="text-sm text-white/55">/ {billingCycleLabel(subscription.billingCycle)}</span>
              </div>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                statusTone === 'emerald' && 'bg-emerald-500/10 text-emerald-300',
                statusTone === 'amber' && 'bg-amber-500/10 text-amber-300',
                statusTone === 'blue' && 'bg-sky-500/10 text-sky-300',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  statusTone === 'emerald' && 'bg-emerald-400',
                  statusTone === 'amber' && 'bg-amber-400',
                  statusTone === 'blue' && 'bg-sky-400',
                )}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <div id="subscription-v2-active-card-actions" className="flex shrink-0 items-center gap-2">
          {isCancelled && onReactivateClick && (
            <button
              id="subscription-v2-active-card-btn-reactivate"
              type="button"
              onClick={onReactivateClick}
              disabled
              title="Reactivation coming soon"
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/55 cursor-not-allowed"
            >
              <RotateCcw size={13} />
              Reactivate
            </button>
          )}
          {!isCancelled && (
            <button
              id="subscription-v2-active-card-btn-cancel"
              type="button"
              onClick={onCancelClick}
              disabled={isCancelling}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors',
                isCancelling
                  ? 'border-white/10 bg-white/5 text-white/45 cursor-not-allowed'
                  : 'border-red-500/30 bg-red-500/8 text-red-200 hover:bg-red-500/12 hover:border-red-500/45 cursor-pointer',
              )}
            >
              {isCancelling ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <X size={13} strokeWidth={2.5} />
              )}
              {isCancelling ? 'Cancelling...' : 'Cancel subscription'}
            </button>
          )}
          {isCancelled && (
            <div
              id="subscription-v2-active-card-cancelled-pill"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3.5 py-2 text-xs font-semibold text-amber-200"
            >
              <CheckCircle2 size={13} strokeWidth={2.5} />
              Cancellation scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
