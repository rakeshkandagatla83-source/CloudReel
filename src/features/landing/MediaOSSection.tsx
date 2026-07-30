import { motion } from 'motion/react'
import { Radio, Calendar, Tv, Database, DollarSign, Share2, BarChart3, ArrowUpRight } from 'lucide-react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const MODULES = [
  { 
    slug: 'studio', 
    tag: 'Core', 
    title: 'AI Studio', 
    desc: 'Live production, vision mixing, and multi-cam control.',
    icon: Radio,
    widget: '● LIVE MIXER',
    widgetStyle: 'bg-live/10 text-live border-live/20',
    accent: 'brand-indigo'
  },
  { 
    slug: 'producer', 
    tag: 'Planning', 
    title: 'AI Producer', 
    desc: 'Automated rundowns, playlists, and smart scheduling.',
    icon: Calendar,
    widget: 'AUTO-CUE RUNDOWN',
    widgetStyle: 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20',
    accent: 'brand-magenta'
  },
  { 
    slug: 'playout', 
    tag: 'Linear', 
    title: 'AI Playout', 
    desc: '24×7 channel playout with guaranteed 99.99% uptime.',
    icon: Tv,
    widget: '24/7 • 99.99% UPTIME',
    widgetStyle: 'bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20',
    accent: 'brand-indigo'
  },
  { 
    slug: 'asset', 
    tag: 'Storage', 
    title: 'AI Asset Manager', 
    desc: 'Cloud MAM library, auto-QC, and facial metadata indexing.',
    icon: Database,
    widget: 'AI TAGS & QC',
    widgetStyle: 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20',
    accent: 'brand-magenta'
  },
  { 
    slug: 'monetization', 
    tag: 'Revenue', 
    title: 'AI Monetization', 
    desc: 'Dynamic SCTE-35 ad markers, FAST channels, and paywalls.',
    icon: DollarSign,
    widget: 'SCTE-35 FAST ADS',
    widgetStyle: 'bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20',
    accent: 'brand-indigo'
  },
  { 
    slug: 'distribution', 
    tag: 'Delivery', 
    title: 'AI Distribution Hub', 
    desc: 'Multi-destination simulcasting to OTT, social, and TV.',
    icon: Share2,
    widget: '14 TARGETS CONNECTED',
    widgetStyle: 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20',
    accent: 'brand-magenta'
  },
  { 
    slug: 'insights', 
    tag: 'Data', 
    title: 'AI Insights', 
    desc: 'Real-time viewer analytics, heatmaps, and content AI.',
    icon: BarChart3,
    widget: '+32% RETENTION',
    widgetStyle: 'bg-brand-magenta/10 text-brand-magenta border-brand-magenta/20',
    accent: 'brand-indigo'
  },
]

export function MediaOSSection() {
  return (
    <section id="landing-mediaos" className="relative py-[clamp(64px,9vw,120px)] bg-bg-tint/70 border-y border-line/60 overflow-hidden">
      {/* Tech Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-brand-indigo)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07] pointer-events-none" />
      
      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-24 -left-24 w-[450px] h-[450px] rounded-full bg-brand-indigo/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[450px] h-[450px] rounded-full bg-brand-magenta/15 blur-[120px] pointer-events-none" />

      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="max-w-3xl mb-16">
          <motion.div variants={revealItem}>
            <Eyebrow>The AI Media Operating System</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 mb-6"
          >
            One platform for the entire content lifecycle.
          </motion.h2>
        </div>

        <motion.div 
          id="landing-mediaos-grid"
          variants={revealContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <motion.div
                key={mod.slug}
                variants={revealItem}
                id={`landing-module-${mod.slug}`}
                className="group relative flex flex-col justify-between p-6 rounded-2xl border border-line bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-indigo/15 hover:border-brand-indigo/50 overflow-hidden cursor-default min-h-[220px]"
              >
                {/* Glowing Corner Orb on Hover */}
                <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-brand-grad opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30" />

                {/* Top Header: Tag & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-muted-2 font-bold">
                      {mod.tag}
                    </span>
                    
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-grad group-hover:text-white group-hover:border-transparent shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="font-bold text-ink text-lg mb-1.5 transition-colors group-hover:text-brand-indigo flex items-center justify-between">
                    <span>{mod.title}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-indigo" />
                  </h3>
                  
                  <p className="text-muted text-xs leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                {/* Bottom Micro-Widget Badge */}
                <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold ${mod.widgetStyle}`}>
                    {mod.widget}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
    </section>
  )
}
