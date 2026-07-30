import { cn } from '../../../lib/utils'

interface EyebrowProps {
  children: React.ReactNode
  className?: string
  id?: string
  hasPill?: boolean
}

export function Eyebrow({ children, className, id, hasPill = false }: EyebrowProps) {
  return (
    <div
      id={id}
      className={cn(
        'inline-flex items-center gap-2',
        hasPill && 'px-3 py-1.5 rounded-full border border-line bg-surface',
        className
      )}
    >
      <div className="h-2 w-2 rounded-sm bg-brand-grad" />
      <span className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
        {children}
      </span>
    </div>
  )
}
