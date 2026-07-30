import { cn } from '../../../lib/utils'
import { motion } from 'motion/react'
import type { HTMLMotionProps } from 'motion/react'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all'
  
  const variants = {
    primary: 'bg-brand-indigo text-white shadow-sm hover:shadow-md hover:bg-brand-indigo/90',
    secondary: 'bg-surface border border-line text-ink hover:bg-bg-tint',
    ghost: 'text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line',
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-3',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  )
}
