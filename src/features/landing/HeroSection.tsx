import { ArrowRight, Play } from 'lucide-react'
import { useTheme } from '../../components/ThemeProvider'

const STATS = [
  { num: '6', label: 'Remote Guests' },
  { num: '8+', label: 'Input Protocols' },
  { num: '24/7', label: 'Linear Channels' },
  { num: '1-Click', label: 'Social Publish' },
]

export function HeroSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section id="landing-hero" className="relative min-h-screen flex items-center overflow-hidden bg-primary-bg">
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
          background: `radial-gradient(ellipse 80% 55% at 50% -5%, rgba(48,49,203,${isDark ? 0.22 : 0.10}) 0%, transparent 70%)`,
        }}
      />

      {/* Left accent line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-72 w-px bg-linear-to-b from-transparent via-active-accent/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 pt-24 pb-20 w-full">
        <div className="grid xl:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div id="landing-hero-copy">
            {/* Live badge */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-active-accent/30 bg-active-accent/8">
                <span className="h-1.5 w-1.5 rounded-full bg-active-accent animate-ping" />
                <span className="text-xs font-semibold tracking-[0.2em] text-active-accent uppercase font-mono">
                  Live Broadcast Platform
                </span>
              </div>
              <div className="h-px w-24 bg-linear-to-r from-active-accent/30 to-transparent" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.88] text-primary-text mb-6">
              BROADCAST
              <br />
              <span className="cr-gradient-text">AT SCALE.</span>
              <br />
              <span className="text-secondary-text">PRODUCE ON</span>
              <br />
              CLOUD.
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-secondary-text max-w-lg mb-10 leading-relaxed">
              Create, manage and distribute live video productions to millions of
              viewers across the globe.{' '}
              <span className="text-primary-text font-medium">No hardware. No limits.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-14">
              <a
                id="landing-btn-hero-demo"
                href="#demo"
                className="flex items-center gap-2.5 px-6.5 py-4 bg-active-accent hover:opacity-90 text-white font-semibold text-base rounded-xl transition-all cursor-pointer shadow-[0_0_40px_rgba(48,49,203,0.4)] hover:shadow-[0_0_64px_rgba(48,49,203,0.6)]"
              >
                Request a Demo
                <ArrowRight size={16} />
              </a>
              <a
                id="landing-btn-hero-features"
                href="#features"
                className="flex items-center gap-2.5 px-6.5 py-4 border border-primary-border hover:border-active-accent/40 text-secondary-text hover:text-primary-text rounded-xl transition-all cursor-pointer text-base hover:bg-component-bg"
              >
                <Play size={16} />
                Explore Features
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-primary-border">
              {STATS.map(({ num, label }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="text-3xl font-black text-primary-text leading-none">
                    {num}
                  </span>
                  <span className="text-xs text-muted-text tracking-widest uppercase font-mono">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Broadcast UI mockup (intentionally dark in both themes) */}
          <div className="hidden xl:flex justify-end">
            <BroadcastMockup />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-primary-bg to-transparent pointer-events-none" />
    </section>
  )
}

const GUEST_VIDEOS = [
  '/videos/guest1.mp4',
  '/videos/guest2.mp4',
  '/videos/guest3.mp4',
  '/videos/guest4.mp4',
  '/videos/guest5.mp4',
  '/videos/guest6.mp4',
]

const GUEST_NAMES = [
  'Ashley Meyer (NYS)',
  'Gary McPherson (NYS)',
  'Josh Stiller (NYS)',
  'Sen. Kennedy (1960)',
  'VP Nixon (1960)',
  'H. K. Smith (Host)',
]

function BroadcastMockup() {
  const waveHeights = [3, 5, 8, 6, 9, 7, 4, 8, 10, 7, 5, 9, 6, 8, 4]

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
      <div className="relative rounded-2xl border border-white/10 bg-[#0a1020]/95 backdrop-blur-sm overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 bg-[#060b14]/60">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-active-accent animate-pulse" />
            <span className="text-[10px] font-semibold tracking-[0.2em] text-active-accent uppercase font-mono">
              ON AIR
            </span>
            <span className="text-[10px] text-white/20 font-mono">
              CR
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-active-accent/25 border border-active-accent/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/8 border border-white/12" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/8 border border-white/12" />
          </div>
        </div>

        {/* Main preview */}
        <div className="relative h-52 bg-linear-to-br from-[#0d1a2e] to-[#060b14] overflow-hidden">
          {/* Split screen layout of Guest 1 and Guest 2 */}
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full border-r border-white/10 relative overflow-hidden">
              <video
                src={GUEST_VIDEOS[0]}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-3 z-10 px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white/90 font-mono tracking-wider">
                {GUEST_NAMES[0]}
              </span>
            </div>
            <div className="w-1/2 h-full relative overflow-hidden">
              <video
                src={GUEST_VIDEOS[1]}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute bottom-3 right-3 z-10 px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white/90 font-mono tracking-wider">
                {GUEST_NAMES[1]}
              </span>
            </div>
          </div>

          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Channel label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-6xl font-black text-white/5 select-none tracking-[0.2em]">
              MAIN
            </span>
          </div>
          {/* Audio waveform */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-end gap-0.5 bg-black/40 px-2 py-1 rounded backdrop-blur-xs">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-sm bg-active-accent/70"
                style={{ height: `${h * 1.5}px` }}
              />
            ))}
          </div>
          {/* HD badge */}
          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-black/50 border border-white/8 backdrop-blur-xs">
            <span className="text-[9px] text-white/50 font-mono">
              1080p HD
            </span>
          </div>
          {/* Live duration */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-active-accent/80 border border-active-accent/20 shadow-[0_0_10px_rgba(48,49,203,0.3)]">
            <span className="h-1 w-1 rounded-full bg-white animate-ping" />
            <span className="text-[9px] text-white font-semibold font-mono">
              02:47:31
            </span>
          </div>
        </div>

        {/* Guest grid */}
        <div className="p-3 border-t border-white/6">
          <div className="text-[9px] text-white/18 mb-2 tracking-[0.2em] uppercase font-mono">
            Remote Guests (6)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {GUEST_VIDEOS.map((url, i) => (
              <div
                key={i}
                className="aspect-video rounded-lg bg-[#0d1a2e] border border-white/6 flex items-center justify-center relative overflow-hidden"
              >
                <video
                  src={url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
                <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/60 text-[7px] text-white/80 font-mono tracking-wider">
                  {GUEST_NAMES[i]}
                </span>
                {i < 2 && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-linear-to-r from-active-accent/0 via-active-accent/50 to-active-accent/0" />
                )}
                {i < 2 && (
                  <div className="absolute top-1 right-1 h-1 w-1 rounded-full bg-active-accent/80 animate-pulse" />
                )}
              </div>
            ))}
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
      <div className="absolute -right-4 top-12 flex flex-col gap-2">
        {[
          { label: 'RTMP IN', color: '#10b981' },
          { label: 'SRT OUT', color: '#3b82f6' },
        ].map(({ label, color }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-sm"
            style={{
              borderColor: `${color}25`,
              background: `${color}10`,
            }}
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
