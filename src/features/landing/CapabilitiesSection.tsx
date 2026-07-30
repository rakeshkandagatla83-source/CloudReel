import { motion } from 'motion/react'
import { Radio, Users, MonitorPlay, Layers, BarChart, Mic, Share2 } from 'lucide-react'

import { Eyebrow } from './ui/Eyebrow'
import { CapabilityCard, type CapabilityAccent } from './CapabilityCard'
import { MultiviewerCard } from './MultiviewerCard'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const CAPABILITIES: {
  slug: string
  category: string
  title: string
  desc: string
  icon: typeof Radio
  chips: string[]
  checks: string[]
  accent: CapabilityAccent
}[] = [
  {
    slug: 'linear',
    category: 'Output',
    title: '24/7 Linear Channels',
    desc: 'Always-on HD to OTT, social, and TV.',
    icon: Radio,
    chips: ['RTMP', 'SRT', 'HLS', 'ZIXI'],
    checks: ['24/7 Uptime', 'Cloud Playout'],
    accent: 'brand-indigo',
  },
  {
    slug: 'guests',
    category: 'Ingest',
    title: 'Remote Guests',
    desc: 'Up to 16 WebRTC callers.',
    icon: Users,
    chips: ['WebRTC', 'Green Room', 'IFB'],
    checks: ['Low Latency', 'A/V Control'],
    accent: 'brand-magenta',
  },
  {
    slug: 'switching',
    category: 'Vision Mixing',
    title: 'Live Source Switching',
    desc: 'Cut, dissolve, wipe with zero latency.',
    icon: MonitorPlay,
    chips: [],
    checks: ['Preview-before-publish', 'Built-in DVR'],
    accent: 'brand-indigo',
  },
  {
    slug: 'graphics',
    category: 'Vision Mixing',
    title: 'Graphics & Overlay',
    desc: 'Lower-thirds, bugs, L-bands, astons.',
    icon: Layers,
    chips: [],
    checks: ['Multi-layer', 'Dynamic Data'],
    accent: 'brand-magenta',
  },
  {
    slug: 'polls',
    category: 'Engagement',
    title: 'Live Polls & Surveys',
    desc: 'Real-time audience engagement overlays.',
    icon: BarChart,
    chips: [],
    checks: ['Instant Results', 'Custom styling'],
    accent: 'brand-indigo',
  },
  {
    slug: 'studio',
    category: 'Control',
    title: 'Cloud Studio',
    desc: 'Talkback, IFB, green room, pre-air QC.',
    icon: Mic,
    chips: [],
    checks: ['No hardware', 'Global Access'],
    accent: 'brand-magenta',
  },
  {
    slug: 'social',
    category: 'Output',
    title: '1-Click Social Publish',
    desc: 'Simulcast to Facebook, YouTube, Twitch.',
    icon: Share2,
    chips: [],
    checks: ['AI Captions', 'Multi-dest'],
    accent: 'brand-indigo',
  },
]

export function CapabilitiesSection() {
  return (
    <section id="landing-capabilities" className="py-[clamp(64px,9vw,120px)] bg-bg">
      {/* SVG gradient def — used by AICrewSection's icons via url(#brandGrad).
          Capability cards below use solid per-card accent colors instead.
          Zero-size + absolute (not `hidden`/display:none) so the gradient
          still resolves when referenced from elsewhere on the page. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-magenta)" />
            <stop offset="50%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="var(--color-brand-indigo)" />
          </linearGradient>
        </defs>
      </svg>

      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="max-w-3xl mb-16">
          <motion.div variants={revealItem}>
            <Eyebrow>Platform Capabilities</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 mb-6"
          >
            Everything a control room does — engineered for the cloud.
          </motion.h2>
          
          <motion.p variants={revealItem} className="text-muted text-lg">
            A full pipeline in one place: bring sources in, mix live, deliver everywhere at once.
          </motion.p>
        </div>

        <motion.div
          id="landing-cap-grid"
          variants={revealContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CAPABILITIES.map((cap) => (
            <CapabilityCard
              key={cap.slug}
              id={`landing-cap-card-${cap.slug}`}
              icon={cap.icon}
              category={cap.category}
              title={cap.title}
              desc={cap.desc}
              checks={cap.checks}
              chips={cap.chips}
              accent={cap.accent}
            />
          ))}
          
          {/* Multiviewer takes remaining space */}
          <MultiviewerCard />
        </motion.div>
      </motion.div>
    </section>
  )
}
