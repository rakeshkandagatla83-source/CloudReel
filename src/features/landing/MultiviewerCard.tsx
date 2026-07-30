import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/utils'
import { GUEST_VIDEOS } from './guestRoster'

export function MultiviewerCard() {
  const [activeCell, setActiveCell] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion) return
    const interval = setInterval(() => {
      setActiveCell((prev) => (prev + 1) % 6)
    }, 2400)
    return () => clearInterval(interval)
  }, [shouldReduceMotion])

  return (
    <div
      id="landing-multiviewer"
      className="col-span-full md:col-span-2 lg:col-span-3 bg-brand-grad rounded-2xl border border-white/20 p-6 shadow-lg flex flex-col lg:flex-row gap-8 items-center"
    >
      <div className="flex-1 space-y-4">
        <h3 className="text-xl font-bold !text-white uppercase tracking-tight">
          See every feed at a glance.
        </h3>
        <p className="!text-white/90 text-base leading-relaxed">
          Monitor all your remote guests, pre-recorded videos, and inputs in real-time with ultra-low latency playback directly in your browser.
        </p>
      </div>

      <div className="flex-[1.5] w-full grid grid-cols-3 gap-2 bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/30 shadow-inner">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            id={`landing-mv-cell-${i}`}
            className="relative aspect-video bg-[#1A1D24] rounded-md overflow-hidden"
          >
            {/* Live source feed */}
            <video
              src={GUEST_VIDEOS[i]}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <span className="absolute bottom-1 left-1 z-10 px-1 py-0.5 rounded-sm bg-black/60 text-white/70 text-[8px] font-mono tracking-wider">
              CAM {i + 1}
            </span>

            {/* Active highlight */}
            {!shouldReduceMotion && (
              <motion.div
                initial={false}
                animate={{
                  opacity: activeCell === i ? 1 : 0,
                  scale: activeCell === i ? 1 : 0.95,
                }}
                className={cn(
                  "absolute inset-0 border-2 rounded-md transition-colors",
                  activeCell === i ? "border-live" : "border-transparent"
                )}
              />
            )}
            
            {/* Reduced motion fallback */}
            {shouldReduceMotion && i === 0 && (
              <div className="absolute inset-0 border-2 border-live rounded-md" />
            )}

            {/* Metadata (ON AIR or Latency) */}
            <div className="absolute top-1.5 left-1.5 flex gap-1">
              {(activeCell === i || (shouldReduceMotion && i === 0)) ? (
                <div className="bg-live text-white text-[9px] font-mono font-bold px-1 rounded-sm uppercase">
                  On Air
                </div>
              ) : null}
              <div className="bg-black/60 text-white/80 text-[9px] font-mono px-1 rounded-sm backdrop-blur-sm">
                42ms
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
