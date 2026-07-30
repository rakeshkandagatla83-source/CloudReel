import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { Chip } from './ui/Chip'

export type CapabilityAccent =
  | 'brand-indigo'
  | 'brand-magenta'
  | 'accent-blue'
  | 'accent-teal'
  | 'accent-amber'
  | 'accent-violet'
  | 'accent-cyan'

interface CapabilityCardProps {
  id: string
  icon: LucideIcon
  category: string
  title: string
  desc: string
  checks: string[]
  chips: string[]
  accent: CapabilityAccent
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  hover: { y: -6, scale: 1.015, transition: { type: 'spring', stiffness: 300, damping: 22 } },
}

const iconVariants: Variants = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.08, rotate: -4, transition: { type: 'spring', stiffness: 300, damping: 15 } },
}

const shineVariants: Variants = {
  rest: { x: '-30%', opacity: 0 },
  hover: { x: '260%', opacity: 1, transition: { duration: 0.7, ease: 'easeInOut' } },
}

export function CapabilityCard({ id, icon: Icon, category, title, desc, checks, chips, accent }: CapabilityCardProps) {
  const reduce = useReducedMotion()
  const accentVar = { '--accent': `var(--color-${accent})` } as CSSProperties

  return (
    <motion.div
      id={id}
      variants={cardVariants}
      whileHover={reduce ? undefined : 'hover'}
      style={accentVar}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all duration-300 hover:border-[var(--accent)]/60 hover:shadow-lg hover:shadow-[var(--accent)]/15"
    >
      {/* glossy glow blob, tucked behind the icon corner */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[var(--accent)]/25 opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70" />
      {/* glass sheen across the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-linear-to-b from-white/50 to-transparent" />
      {/* light sweep on hover */}
      {!reduce && (
        <motion.div
          variants={shineVariants}
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/50 to-transparent"
        />
      )}

      <div className="relative flex items-center gap-4 mb-4">
        <motion.div
          variants={iconVariants}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/12"
        >
          <Icon className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.1} />
        </motion.div>
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
            {category}
          </div>
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
        </div>
      </div>

      <p className="relative mb-6 flex-1 text-sm text-muted">{desc}</p>

      {(checks.length > 0 || chips.length > 0) && (
        <div className="relative mt-auto space-y-4 border-t border-line pt-6">
          {checks.length > 0 && (
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check} className="flex items-center gap-2 text-sm font-medium text-ink">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  {check}
                </li>
              ))}
            </ul>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Chip key={chip}>{chip}</Chip>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
