import { motion } from 'motion/react'
import { 
  Volume2, LayoutGrid, Radio, Sparkles, Share2, MessageSquare
} from 'lucide-react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

export function ValueSection() {
  return (
    <section
      id="landing-value"
      className="relative bg-bg-tint/70 py-[clamp(64px,9vw,120px)] border-y border-line/60 overflow-hidden"
    >
      {/* Tech Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-brand-indigo)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07] pointer-events-none" />
      
      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-brand-magenta/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full bg-brand-indigo/15 blur-[120px] pointer-events-none" />

      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        {/* Header Block */}
        <div className="flex flex-col gap-6 mb-12 lg:mb-16">
          <motion.div variants={revealItem}>
            <Eyebrow>More than cloud production</Eyebrow>
          </motion.div>
          
          <motion.h2
            id="landing-value-headline"
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] max-w-4xl"
          >
            It's a complete AI TV studio in your browser.
          </motion.h2>
        </div>

        {/* Narrative Grid */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16 lg:mb-20">
          <motion.p variants={revealItem} className="text-muted text-base leading-[1.65]">
            CloudReel automates the work of an entire crew — creators, broadcasters, enterprises and universities launch professional live channels with{' '}
            <strong className="text-ink font-semibold">one person and one camera.</strong>
          </motion.p>
          
          <motion.p variants={revealItem} className="text-muted text-base leading-[1.65]">
            News, podcasts, sports, webinars, TV channels or social shows — complex broadcast workflows become a{' '}
            <strong className="text-ink font-semibold">simple, browser-based experience</strong>, from first input to final publish.
          </motion.p>
        </div>

        {/* Interactive Floating Studio UI Widgets Showcase */}
        <motion.div variants={revealItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Widget 1: Audio Mixer */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-indigo/50 hover:shadow-brand-indigo/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <Volume2 className="w-4 h-4 text-brand-indigo" />
                <span>AI AUDIO MIXER</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo font-mono text-[10px] font-bold">
                AUTO-LEVELING
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted w-12">MIC 1</span>
                <div className="flex-1 h-2 rounded-full bg-line overflow-hidden flex gap-0.5">
                  <div className="h-full bg-brand-grad w-[75%] rounded-l animate-pulse" />
                  <div className="h-full bg-amber-500 w-[15%]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted w-12">MASTER</span>
                <div className="flex-1 h-2 rounded-full bg-line overflow-hidden flex gap-0.5">
                  <div className="h-full bg-brand-grad w-[85%] rounded-l animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Widget 2: Layout Switcher */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.5 }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-magenta/50 hover:shadow-brand-magenta/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <LayoutGrid className="w-4 h-4 text-brand-magenta" />
                <span>LAYOUT PRESETS</span>
              </div>
              <span className="text-[10px] font-mono text-muted">AI SCENE SWITCH</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['1-UP', '50/50', 'PIP', 'GRID'].map((layout, i) => (
                <div
                  key={layout}
                  className={`px-2 py-2 rounded-lg text-center font-mono text-[10px] font-bold transition-all ${
                    i === 1
                      ? 'bg-brand-grad text-white shadow-md scale-105'
                      : 'bg-bg-tint text-muted border border-line hover:text-ink'
                  }`}
                >
                  {layout}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Widget 3: Live Broadcast Status */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1 }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-indigo/50 hover:shadow-brand-indigo/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <Radio className="w-4 h-4 text-live animate-pulse" />
                <span className="text-live">LIVE TO AIR</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-live/10 text-live font-mono text-[10px] font-bold">
                1080p60
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-muted pt-2 border-t border-line">
              <span>LATENCY: <strong className="text-ink">42ms</strong></span>
              <span>PROTOCOL: <strong className="text-ink">SRT H.264</strong></span>
            </div>
          </motion.div>

          {/* Widget 4: Lower Third Graphics */}
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ repeat: Infinity, duration: 5.8, ease: 'easeInOut', delay: 1.5 }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-magenta/50 hover:shadow-brand-magenta/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <Sparkles className="w-4 h-4 text-brand-magenta" />
                <span>DYNAMIC GRAPHICS OVERLAY</span>
              </div>
            </div>
            <div className="bg-brand-grad p-3 rounded-xl text-white shadow-md">
              <div className="font-bold text-xs uppercase tracking-wider">LIVE INTERVIEW</div>
              <div className="text-[11px] text-white/80 font-mono truncate">Sarah Chen • Lead Media Architect</div>
            </div>
          </motion.div>

          {/* Widget 5: Multi-Destination Stream */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut', delay: 0.8 }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-indigo/50 hover:shadow-brand-indigo/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <Share2 className="w-4 h-4 text-brand-indigo" />
                <span>SIMULCAST TARGETS</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['YouTube Live', 'Twitch TV', 'LinkedIn'].map((platform) => (
                <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-tint border border-line text-[11px] font-mono font-semibold text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                  {platform}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Widget 6: AI Real-Time Captioning */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6.2, ease: 'easeInOut', delay: 1.2 }}
            className="group relative p-5 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-brand-magenta/50 hover:shadow-brand-magenta/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink">
                <MessageSquare className="w-4 h-4 text-brand-magenta" />
                <span>AI AUTO-CAPTIONS</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-brand-magenta/10 text-brand-magenta font-mono text-[10px] font-bold">
                12 LANGUAGES
              </span>
            </div>
            <p className="text-xs font-mono text-muted bg-bg-tint p-2.5 rounded-lg border border-line leading-relaxed">
              "Live captions automatically generated and translated with sub-second accuracy..."
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
