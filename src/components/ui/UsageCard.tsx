import { cn } from '../../lib/utils'

interface UsageCardProps {
  id: string
  title: string
  used: number
  limit: number
  unit: string
  billingPeriodEnd: Date | null
  loading?: boolean
  isTrialing?: boolean
  trialEndsAt?: Date | null
}

function formatHours(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getStatusColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getStatusLabel(percentage: number, isTrialing: boolean): string {
  if (isTrialing) return 'Trial'
  if (percentage >= 100) return 'Limit reached'
  if (percentage >= 80) return 'Approaching limit'
  return 'On track'
}

export function UsageCard({
  id,
  title,
  used,
  limit,
  unit,
  billingPeriodEnd,
  loading = false,
  isTrialing = false,
  trialEndsAt,
}: UsageCardProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const statusColor = isTrialing ? 'bg-blue-500' : getStatusColor(percentage)
  const statusLabel = getStatusLabel(percentage, isTrialing)
  const displayDate = isTrialing ? trialEndsAt : billingPeriodEnd
  const resetDate = displayDate?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const resetLabel = isTrialing ? 'Trial expires' : 'Resets'

  return (
    <div
      id={id}
      className="rounded-lg bg-white/3 border border-white/8 p-5"
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', statusColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Usage text */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-white/70">
          {loading ? '—' : unit === 'hours' ? formatHours(used) : used} / {limit} {unit}
        </span>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded',
          isTrialing
            ? 'bg-blue-500/15 text-blue-400'
            : percentage >= 100
              ? 'bg-red-500/15 text-red-400'
              : percentage >= 80
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-emerald-500/15 text-emerald-400',
        )}>
          {statusLabel}
        </span>
      </div>

      {/* Reset date */}
      {resetDate && (
        <p className="text-[11px] text-white/35 font-mono">
          {resetLabel} {resetDate}
        </p>
      )}
    </div>
  )
}
