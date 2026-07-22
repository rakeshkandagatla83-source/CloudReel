import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { getMySubscription } from '../lib/subscriptionV2Api'
import type { CurrentSubscription } from '../types/subscriptionV2'

type ResultStatus = 'polling' | 'active' | 'pending' | 'failed' | 'timeout' | 'error'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_DURATION_MS = 30_000

export function SubscriptionV2ResultPage() {
  const [status, setStatus] = useState<ResultStatus>('polling')
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await getMySubscription()
        if (cancelled) return

        if (res.code !== 1) {
          setErrorMessage(res.Message || 'Failed to load subscription')
          setStatus('error')
          return
        }

        const sub = res.data ?? null
        setSubscription(sub)

        if (sub?.status === 'active' || sub?.status === 'trialing') {
          setStatus('active')
          return
        }

        if (sub?.status === 'failed') {
          setStatus('failed')
          return
        }

        const elapsed = Date.now() - startTimeRef.current
        if (elapsed >= MAX_POLL_DURATION_MS) {
          setStatus(sub?.status === 'pending' ? 'pending' : 'timeout')
          return
        }

        timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load subscription')
        setStatus('error')
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return (
    <div id="subscription-v2-result-page" className="flex h-full items-center justify-center px-6 py-10">
      <div
        id="subscription-v2-result-card"
        className={cn(
          'w-full max-w-md rounded-2xl border p-8 text-center transition-colors',
          status === 'active'
            ? 'border-emerald-500/30 bg-linear-to-b from-[#0a1a13] to-[#0a1020]'
            : status === 'failed' || status === 'error'
              ? 'border-red-500/30 bg-linear-to-b from-[#1a0a0b] to-[#0a1020]'
              : status === 'timeout' || status === 'pending'
                ? 'border-amber-500/30 bg-linear-to-b from-[#1a140a] to-[#0a1020]'
                : 'border-white/10 bg-surface',
        )}
      >
        {status === 'polling' && (
          <>
            <Loader2 size={42} className="mx-auto animate-spin text-[#3031cb]" />
            <h1 id="subscription-v2-result-title" className="mt-5 text-xl font-semibold text-white">
              Confirming your payment
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Please wait while we verify your subscription. This usually takes a few seconds.
            </p>
          </>
        )}

        {status === 'active' && (
          <>
            <CheckCircle2 size={42} className="mx-auto text-emerald-400" />
            <h1 id="subscription-v2-result-title" className="mt-5 text-xl font-semibold text-white">
              Welcome aboard!
            </h1>
            <p className="mt-2 text-sm text-white/65">
              Your subscription to{' '}
              <span className="font-semibold text-white">{subscription?.planName}</span> is now active.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                id="subscription-v2-result-btn-events"
                to="/events"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-4 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors"
              >
                Go to Events
                <ArrowRight size={14} />
              </Link>
              <Link
                id="subscription-v2-result-btn-manage"
                to="/subscription-v2"
                className="text-xs text-white/45 hover:text-white/75 cursor-pointer"
              >
                Manage subscription
              </Link>
            </div>
          </>
        )}

        {(status === 'pending' || status === 'timeout') && (
          <>
            <AlertCircle size={42} className="mx-auto text-amber-400" />
            <h1 id="subscription-v2-result-title" className="mt-5 text-xl font-semibold text-white">
              Still processing
            </h1>
            <p className="mt-2 text-sm text-white/65">
              We haven't received confirmation from the payment provider yet. This can take a few minutes - your subscription will activate automatically once it lands.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                id="subscription-v2-result-btn-refresh"
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-white/8 hover:bg-white/12 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors"
              >
                Refresh
              </button>
              <Link
                id="subscription-v2-result-btn-back"
                to="/subscription-v2"
                className="text-xs text-white/45 hover:text-white/75 cursor-pointer"
              >
                Back to plans
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <AlertCircle size={42} className="mx-auto text-red-400" />
            <h1 id="subscription-v2-result-title" className="mt-5 text-xl font-semibold text-white">
              Payment failed
            </h1>
            <p className="mt-2 text-sm text-white/65">
              The payment couldn't be completed. No charge was made. You can try again with the same or a different payment method.
            </p>
            <div className="mt-6">
              <Link
                id="subscription-v2-result-btn-retry"
                to="/subscription-v2"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-4 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors"
              >
                Try again
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={42} className="mx-auto text-red-400" />
            <h1 id="subscription-v2-result-title" className="mt-5 text-xl font-semibold text-white">
              Couldn't load subscription
            </h1>
            <p className="mt-2 text-sm text-white/65">
              {errorMessage ?? 'Something went wrong while checking your subscription.'}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                id="subscription-v2-result-btn-retry"
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-4 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors"
              >
                Retry
              </button>
              <Link
                id="subscription-v2-result-btn-back"
                to="/subscription-v2"
                className="text-xs text-white/45 hover:text-white/75 cursor-pointer"
              >
                Back to plans
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
