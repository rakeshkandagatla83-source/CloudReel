import { motion } from 'motion/react'
import { cn } from '../../../lib/utils'
import { hoverCard } from '../motionPresets'

interface CardProps {
  children: React.ReactNode
  className?: string
  id?: string
}

export function Card({ children, className, id }: CardProps) {
  return (
    <motion.div
      id={id}
      variants={hoverCard}
      whileHover="hover"
      className={cn(
        'bg-surface rounded-2xl border border-line p-6 shadow-sm',
        'hover:shadow-md hover:border-brand-indigo/30 transition-shadow',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
