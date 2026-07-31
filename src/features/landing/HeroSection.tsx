import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowRight, Play } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTheme } from '../../components/ThemeProvider'
import { revealContainer, revealItem, lineContainer, lineReveal } from './motionPresets'
import { GUEST_VIDEOS, GUEST_NAMES, HOST_INDEX, PARTICIPANT_POOL } from './guestRoster'

const STATS = [
  { num: '6', label: 'Remote Guests' },
  { num: '8+', label: 'Input Protocols' },
  { num: '24/7', label: 'Linear Channels' },
  { num: '1-Click', label: 'Social Publish' },
]

const TRUST = ['Browser-based', 'Up to 8 live inputs', 'Multi-platform output']

const HEADLINE_LINES: { text: string; className?: string }[] = [
  { text: 'BROADCAST' },
  { text: 'AT SCALE.', className: 'cr-gradient-text' },
  { text: 'PRODUCE ON', className: 'text-secondary-text' },
  { text: 'CLOUD.' },
]

export function HeroSection() {
  const { theme } = useTheme()
  const reduce = useReducedMotion()
  const isDark = theme === 'dark'

  return (
    <section
      id="landing-hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-primary-bg scroll-mt-16"
    >
      {/* Grid background */}
      <div
        id="landing-hero-grid"
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Top radial glow — CloudReel brand */}
      <div
        className="absolute inset-x-0 top-0 h-175 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 55% at 50% -5%, rgba(48,49,203,${isDark ? 0.22 : 0.1}) 0%, transparent 70%)`,
        }}
      />

      {/* Left accent line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-72 w-px bg-linear-to-b from-transparent via-active-accent/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 pt-24 pb-20 w-full">
        <div className="grid xl:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            id="landing-hero-copy"
            variants={revealContainer}
            initial={reduce ? false : 'hidden'}
            animate="visible"
          >
            {/* Live badge */}
            <motion.div variants={revealItem} className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-active-accent/30 bg-active-accent/8">
                <span className="h-1.5 w-1.5 rounded-full bg-active-accent animate-ping" />
                <span className="text-xs font-semibold tracking-[0.2em] text-active-accent uppercase font-mono">
                  Live Broadcast Platform
                </span>
              </div>
              <div className="h-px w-24 bg-linear-to-r from-active-accent/30 to-transparent" />
            </motion.div>

            {/* Headline — per-line clip reveal */}
            <motion.h1
              id="landing-hero-headline"
              variants={lineContainer}
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.9] text-primary-text mb-6"
            >
              {HEADLINE_LINES.map((line) => (
                <span
                  key={line.text}
                  className="block overflow-hidden py-[0.08em] -my-[0.08em]"
                >
                  <motion.span
                    variants={lineReveal}
                    className={cn('block will-change-transform', line.className)}
                  >
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={revealItem}
              className="text-lg text-secondary-text max-w-lg mb-8 leading-relaxed"
            >
              Create, manage and distribute broadcast-quality live video to
              millions of viewers across the globe.{' '}
              <span className="text-primary-text font-medium">
                No hardware. No crew. No limits.
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div variants={revealItem} className="flex flex-wrap items-center gap-4 mb-8">
              <a
                id="landing-btn-hero-demo"
                href="#start"
                className="group flex items-center gap-2.5 px-6.5 py-4 bg-active-accent hover:opacity-90 text-white font-semibold text-base rounded-xl transition-all cursor-pointer shadow-[0_0_40px_rgba(48,49,203,0.4)] hover:shadow-[0_0_64px_rgba(48,49,203,0.6)]"
              >
                Request a Demo
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </a>
              <a
                id="landing-btn-hero-features"
                href="#capabilities"
                className="flex items-center gap-2.5 px-6.5 py-4 border border-primary-border hover:border-active-accent/40 text-secondary-text hover:text-primary-text rounded-xl transition-all cursor-pointer text-base hover:bg-component-bg"
              >
                <Play size={16} />
                Explore Features
              </a>
            </motion.div>

            {/* Trust row */}
            <motion.ul
              variants={revealItem}
              className="flex flex-wrap gap-x-6 gap-y-2 mb-14 list-none p-0"
            >
              {TRUST.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[13px] text-muted-text font-mono tracking-wide"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-linear-to-r from-accent-from to-accent-to" />
                  {item}
                </li>
              ))}
            </motion.ul>

            {/* Stats */}
            <motion.div
              variants={revealContainer}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-primary-border"
            >
              {STATS.map(({ num, label }) => (
                <motion.div key={label} variants={revealItem} className="flex flex-col gap-1.5">
                  <span className="text-3xl font-black text-primary-text leading-none">{num}</span>
                  <span className="text-xs text-muted-text tracking-widest uppercase font-mono">
                    {label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Broadcast UI mockup (intentionally dark in both themes) */}
          <motion.div
            className="hidden xl:flex justify-end"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <BroadcastMockup reduce={!!reduce} />
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-primary-bg to-transparent pointer-events-none" />
    </section>
  )
}

const WAVE_BARS = [3, 5, 8, 6, 9, 7, 4, 8, 10, 7, 5, 9, 6, 8, 4]
const LAYOUT_COUNTS = [1, 2, 3, 4] as const
const LAYOUT_GRID_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 grid-rows-2',
}
const LAYOUT_AUTO_ADVANCE_MS = 3200
const TC_START_SECONDS = 2 * 3600 + 47 * 60 + 31 // 02:47:31

function formatTimecode(totalSeconds: number) {
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

function BroadcastMockup({ reduce }: { reduce: boolean }) {
  const [elapsed, setElapsed] = useState(TC_START_SECONDS)
  const [layoutCount, setLayoutCount] = useState<number>(1)
  const [participantOffset, setParticipantOffset] = useState(0)

  // Running timecode
  useEffect(() => {
    if (reduce) return
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [reduce])

  // Auto-cycle the layout selector 1 -> 2 -> 3 -> 4 -> loop, rotating which
  // participants join each time it wraps so more of the roster is shown over time.
  // A single interval lives for the component's lifetime — a manual click just
  // overrides `layoutCount` directly and the same interval advances from there,
  // instead of tearing down/recreating a timer on every click.
  useEffect(() => {
    if (reduce) return
    const timer = setInterval(() => {
      setLayoutCount((prev) => {
        const next = prev === 4 ? 1 : prev + 1
        if (next === 1) {
          setParticipantOffset((offset) => (offset + 1) % PARTICIPANT_POOL.length)
        }
        return next
      })
    }, LAYOUT_AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [reduce])

  const handleSelectLayout = (count: number) => {
    setLayoutCount(count)
  }

  // Host is pinned first; participants fill the remaining slots for the chosen layout.
  const slotIndices = useMemo(() => {
    const participants = Array.from({ length: layoutCount - 1 }, (_, i) =>
      PARTICIPANT_POOL[(participantOffset + i) % PARTICIPANT_POOL.length],
    )
    return [HOST_INDEX, ...participants]
  }, [layoutCount, participantOffset])

  return (
    <div id="landing-hero-mockup" className="dark-panel relative w-110">
      {/* Background glow */}
      <div
        className="absolute -inset-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(48,49,203,0.10) 0%, transparent 65%)',
        }}
      />

      {/* Main control panel */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0a1020]/95 backdrop-blur-sm overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_40px_rgba(59,56,208,0.18)]">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 bg-[#060b14]/60">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-active-accent animate-pulse" />
            <span className="text-[10px] font-semibold tracking-[0.2em] text-active-accent uppercase font-mono">
              ON AIR
            </span>
            <span className="text-[10px] text-white/20 font-mono">CR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-active-accent/25 border border-active-accent/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/8 border border-white/12" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/8 border border-white/12" />
          </div>
        </div>

        {/* Layout selector — host + participants, 1/2/3/4-way program layouts */}
        <div
          id="landing-hero-layout-selector"
          className="flex items-center justify-between px-4 py-2 border-b border-white/6 bg-[#060b14]/40"
        >
          <span className="text-[9px] font-mono tracking-[0.16em] text-white/35 uppercase">
            Layout
          </span>
          <div className="flex items-center gap-1">
            {LAYOUT_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                id={`landing-hero-layout-btn-${count}`}
                aria-label={`Switch program to a ${count}-way layout`}
                aria-pressed={layoutCount === count}
                onClick={() => handleSelectLayout(count)}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-mono font-semibold transition-colors cursor-pointer',
                  layoutCount === count
                    ? 'bg-active-accent text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70',
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Main preview — PROGRAM output, recomposed by the layout selector */}
        <div className="relative h-52 bg-linear-to-br from-[#0d1a2e] to-[#060b14] overflow-hidden">
          <div
            className={cn(
              'absolute inset-0 grid gap-0.5 bg-white/6',
              LAYOUT_GRID_CLASS[layoutCount],
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {slotIndices.map((guestIndex) => {
                const isHost = guestIndex === HOST_INDEX
                return (
                  <motion.div
                    key={guestIndex}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden bg-[#0d1a2e]"
                  >
                    <video
                      src={GUEST_VIDEOS[guestIndex]}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-sm border-l-2 border-active-accent bg-black/55 backdrop-blur-xs">
                      {isHost && (
                        <span className="text-[6px] font-mono font-bold tracking-[0.1em] text-active-accent uppercase">
                          Host
                        </span>
                      )}
                      <span className="text-[7px] text-white/85 font-mono tracking-wider truncate max-w-24">
                        {GUEST_NAMES[guestIndex]}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Audio waveform */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-end gap-0.5 bg-black/40 px-2 py-1 rounded backdrop-blur-xs h-6">
            {WAVE_BARS.map((h, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-sm bg-active-accent/70 origin-bottom"
                style={{ height: `${h * 1.6}px` }}
                animate={reduce ? undefined : { scaleY: [0.4, 1, 0.55, 0.85, 0.4] }}
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 1.1 + (i % 5) * 0.12,
                        repeat: Infinity,
                        repeatType: 'mirror',
                        ease: 'easeInOut',
                        delay: i * 0.04,
                      }
                }
              />
            ))}
          </div>
          {/* HD badge */}
          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-black/50 border border-white/8 backdrop-blur-xs">
            <span className="text-[9px] text-white/50 font-mono">1080p HD</span>
          </div>
          {/* Live duration */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-active-accent/80 border border-active-accent/20 shadow-[0_0_10px_rgba(48,49,203,0.3)]">
            <span className="h-1 w-1 rounded-full bg-white animate-ping" />
            <span className="text-[9px] text-white font-semibold font-mono tabular-nums">
              {formatTimecode(elapsed)}
            </span>
          </div>
        </div>

        {/* Guest grid */}
        <div className="p-3 border-t border-white/6">
          <div className="text-[9px] text-white/18 mb-2 tracking-[0.2em] uppercase font-mono">
            Remote Guests (6)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {GUEST_VIDEOS.map((url, i) => {
              const isHost = i === HOST_INDEX
              const isSelected = slotIndices.includes(i)
              return (
                <div
                  key={i}
                  className={cn(
                    'aspect-video rounded-lg bg-[#0d1a2e] border flex items-center justify-center relative overflow-hidden transition-all duration-500',
                    isSelected
                      ? 'border-active-accent shadow-[0_0_0_1px_var(--color-active-accent),0_0_22px_-6px_rgba(48,49,203,0.7)]'
                      : 'border-white/6',
                  )}
                >
                  <video
                    src={url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={cn(
                      'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                      isSelected ? 'opacity-95' : 'opacity-60',
                    )}
                  />
                  <span className="absolute bottom-1 left-1 z-10 px-1 py-0.2 rounded bg-black/60 text-[7px] text-white/80 font-mono tracking-wider">
                    {GUEST_NAMES[i]}
                  </span>
                  {(isHost || isSelected) && (
                    <span className="absolute top-1 right-1 z-10 flex items-center gap-1 px-1 py-0.5 rounded bg-active-accent/85 text-[6px] text-white font-mono tracking-wider">
                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                      {isHost ? 'HOST' : 'LIVE'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Protocol row */}
        <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
          {['RTMP', 'SRT', 'WebRTC', 'NDI', 'HLS'].map((p) => (
            <span
              key={p}
              className="px-2 py-0.5 rounded-md bg-white/4 border border-white/7 text-[9px] text-white/28 font-mono"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Floating overlay badges */}
      <div className="absolute -right-4 top-24 flex flex-col gap-2">
        {[
          { label: 'RTMP IN', color: '#10b981' },
          { label: 'SRT OUT', color: '#3b82f6' },
        ].map(({ label, color }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-sm"
            style={{ borderColor: `${color}25`, background: `${color}10` }}
          >
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[10px] font-medium font-mono" style={{ color }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
