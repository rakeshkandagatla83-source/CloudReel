import * as RadixDialog from '@radix-ui/react-dialog'
import { AlertCircle, ArrowRight, Lock, ShieldCheck, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { formatPrice, billingCycleLabel } from './format'
import { getGatewayLogo } from './gatewayLogos'
import type { PlanGroup, PublicPlan } from '../../types/subscriptionV2'

interface GatewayPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: PlanGroup | null
  isSubscribing: boolean
  pendingMappingId: number | null
  error?: string | null
  onSelect: (mapping: PublicPlan) => void
}

export function GatewayPickerModal({
  open,
  onOpenChange,
  group,
  isSubscribing,
  pendingMappingId,
  error,
  onSelect,
}: GatewayPickerModalProps) {
  const headlinePrice = group?.gateways[0]
  const cycleLabel = group ? billingCycleLabel(group.billingCycle) : 'month'
  const gatewayCount = group?.gateways.length ?? 0

  return (
    <RadixDialog.Root open={open} onOpenChange={open => !isSubscribing && onOpenChange(open)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          id="gateway-picker-overlay"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <RadixDialog.Content
          id="gateway-picker-content"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-2xl border border-white/10',
            'bg-secondary-bg',
            'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4',
            'duration-300',
          )}
        >
          {/* Top accent strip - emerald glow (security signal, not alarm) */}
          <div
            id="gateway-picker-accent"
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/50 to-transparent"
          />

          {/* Subtle top highlight - just enough to give the surface depth */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-white/4 to-transparent"
          />

          {/* Close button */}
          <RadixDialog.Close asChild>
            <button
              id="gateway-picker-btn-close"
              type="button"
              disabled={isSubscribing}
              className={cn(
                'absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center',
                'rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-xs',
                'transition-all duration-200',
                'hover:border-white/25 hover:bg-white/10 hover:text-white hover:rotate-90',
                isSubscribing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </RadixDialog.Close>

          {/* Header - eyebrow + plan name + price */}
          <div id="gateway-picker-header" className="relative px-7 pt-9 pb-7">
            <div
              id="gateway-picker-eyebrow"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
            >
              <ShieldCheck size={11} strokeWidth={2.5} />
              <span>Secure Checkout</span>
            </div>

            <RadixDialog.Title
              id="gateway-picker-title"
              className="mt-4 text-3xl font-semibold tracking-tight text-white"
            >
              {group?.planName ?? 'Subscribe'}
            </RadixDialog.Title>

            {group && headlinePrice && (
              <RadixDialog.Description
                id="gateway-picker-subtitle"
                className="mt-2 flex items-baseline flex-wrap gap-x-2 gap-y-1"
              >
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">
                  {formatPrice(headlinePrice.amount, headlinePrice.currencyCode)}
                </span>
                <span className="text-sm text-white/60">/ {cycleLabel}</span>
                {gatewayCount > 1 && (
                  <span className="ml-1 inline-flex items-center rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
                    {gatewayCount} options
                  </span>
                )}
              </RadixDialog.Description>
            )}
          </div>

          {/* Diamond divider */}
          <div className="relative px-7" aria-hidden>
            <div className="h-px w-full bg-linear-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/25 bg-secondary-bg" />
          </div>

          {/* Gateway list */}
          <div id="gateway-picker-list" className="px-5 py-5">
            <div
              id="gateway-picker-list-label"
              className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45"
            >
              {gatewayCount > 1 ? 'Choose payment method' : 'Payment method'}
            </div>

            {error && (
              <div
                id="gateway-picker-error"
                className="mb-3 mx-2 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/8 px-3.5 py-2.5"
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-300" strokeWidth={2.5} />
                <div className="text-xs">
                  <div className="font-medium text-red-200">Checkout couldn't start</div>
                  <div className="mt-0.5 text-red-200/70">{error}</div>
                </div>
              </div>
            )}

            <div className="space-y-2.5 max-h-100 overflow-y-auto px-2">
              {group?.gateways.map(mapping => {
                const Logo = getGatewayLogo(mapping.gatewayCode)
                const isThisPending = isSubscribing && pendingMappingId === mapping.mappingId
                const isDisabled = isSubscribing && !isThisPending

                return (
                  <button
                    key={mapping.mappingId}
                    id={`gateway-picker-row-${mapping.gatewayCode}`}
                    type="button"
                    onClick={() => onSelect(mapping)}
                    disabled={isSubscribing}
                    className={cn(
                      'group/row relative flex w-full items-center gap-4 overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-all duration-200',
                      isThisPending && [
                        'border-emerald-500/55 bg-[#0d1d18]',
                        'shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_8px_24px_-8px_rgba(16,185,129,0.45)]',
                      ],
                      !isThisPending &&
                        !isDisabled && [
                          'border-white/12 bg-[#141b2c]',
                          'hover:border-emerald-500/50 hover:bg-[#142420]',
                          'hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7),0_0_24px_-8px_rgba(16,185,129,0.25)]',
                          'cursor-pointer',
                        ],
                      isDisabled && 'border-white/8 bg-[#10162358] opacity-40 cursor-not-allowed',
                    )}
                  >
                    {/* Left edge accent on pending */}
                    {isThisPending && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 h-full w-0.5 bg-emerald-400"
                      />
                    )}

                    {/* Logo pedestal - lighter so brand colors pop */}
                    <div
                      className={cn(
                        'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
                        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
                        isThisPending
                          ? 'border-emerald-500/30 bg-[#172a24]'
                          : 'border-white/12 bg-[#1c2336] group-hover/row:border-white/22 group-hover/row:bg-[#222a40]',
                      )}
                    >
                      <Logo size={28} />
                    </div>

                    {/* Gateway info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-white truncate tracking-tight">
                        {mapping.gatewayName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                        {isThisPending ? (
                          <>
                            <span className="font-medium text-emerald-300">Redirecting</span>
                            <span className="flex gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:120ms]" />
                              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:240ms]" />
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={11} className="text-emerald-400/80" strokeWidth={2.5} />
                            <span className="text-white/55 capitalize">
                              Recurring · {cycleLabel}ly
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price + arrow circle */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-semibold tabular-nums tracking-tight text-white">
                          {formatPrice(mapping.amount, mapping.currencyCode)}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          {mapping.currencyCode}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200',
                          isThisPending
                            ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/12 bg-white/4 text-white/45 group-hover/row:border-emerald-400/60 group-hover/row:bg-emerald-500/12 group-hover/row:text-emerald-300 group-hover/row:translate-x-0.5',
                        )}
                      >
                        {isThisPending ? (
                          <span className="flex gap-0.5">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:120ms]" />
                            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce [animation-delay:240ms]" />
                          </span>
                        ) : (
                          <ArrowRight size={14} strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trust footer */}
          <div
            id="gateway-picker-footer"
            className="relative border-t border-white/8 bg-[#0a0f1c] px-7 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Lock size={11} className="text-emerald-300" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white/80">End-to-end encrypted</span>
                  <span className="text-[10px] text-white/45">
                    Card details handled by your provider
                  </span>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  256-bit SSL
                </div>
                <div className="mt-0.5 text-[10px] text-white/35">PCI DSS compliant</div>
              </div>
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
