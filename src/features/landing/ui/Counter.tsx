import { useEffect, useRef } from 'react'
import { useInView, useSpring, useReducedMotion } from 'motion/react'

interface CounterProps {
  value: number
  suffix?: string
  prefix?: string
  className?: string
}

export function Counter({ value, suffix = '', prefix = '', className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  const shouldReduceMotion = useReducedMotion()
  
  const springValue = useSpring(0, {
    damping: 50,
    stiffness: 100,
  })

  useEffect(() => {
    if (isInView && !shouldReduceMotion) {
      springValue.set(value)
    } else if (shouldReduceMotion) {
      springValue.set(value)
    }
  }, [isInView, value, springValue, shouldReduceMotion])

  // Custom formatting for the display text
  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + Math.floor(latest).toString() + suffix
      }
    })
  }, [springValue, prefix, suffix])

  return (
    <span ref={ref} className={className}>
      {shouldReduceMotion ? `${prefix}${value}${suffix}` : `${prefix}0${suffix}`}
    </span>
  )
}
