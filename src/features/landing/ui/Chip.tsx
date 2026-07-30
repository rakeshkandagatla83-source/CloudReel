import { cn } from '../../../lib/utils'

interface ChipProps {
  children: React.ReactNode
  className?: string
  id?: string
  isActive?: boolean
}

export function Chip({ children, className, id, isActive = false }: ChipProps) {
  return (
    <span
      id={id}
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-mono tracking-wide uppercase transition-colors',
        isActive
          ? 'border-brand-indigo text-ink bg-brand-indigo/5'
          : 'border-line text-muted bg-surface',
        className
      )}
    >
      {children}
    </span>
  )
}
