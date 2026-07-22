import { Tv2, Users, MonitorPlay, BarChart3, Layers, Mic2, Share2, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Feature {
  id: string
  icon: LucideIcon
  badge: string
  title: string
  description: string
  tags: string[]
  large: boolean
  accent: string
}

const FEATURES: Feature[] = [
  {
    id: 'channels',
    icon: Tv2,
    badge: '24/7',
    title: '24/7 Linear Channel Broadcasting',
    description:
      'Launch always-on linear channels with full HD broadcast quality. Distribute to OTT, social, and TV platforms simultaneously across all major video protocols.',
    tags: ['RTMP', 'SRT', 'HLS', 'ZIXI', 'RTP', 'RTSP'],
    large: true,
    accent: '#3031cb',
  },
  {
    id: 'guests',
    icon: Users,
    badge: 'Up to 6',
    title: 'Remote Guest Management',
    description:
      'Host up to 6 remote guests via WebRTC with full audio/video input control, custom appearance, and virtual green rooms for pre-broadcast checks.',
    tags: ['WebRTC', 'Green Room', 'IFB', 'HD Audio'],
    large: false,
    accent: '#3b82f6',
  },
  {
    id: 'switching',
    icon: MonitorPlay,
    badge: 'Real-time',
    title: 'Live Source Switching',
    description:
      'Cut, dissolve, or wipe between cameras, remote participants, and field equipment. Preview before you publish — every transition, zero latency.',
    tags: ['RTMP', 'NDI', 'WebRTC', 'HLS'],
    large: false,
    accent: '#10b981',
  },
  {
    id: 'polls',
    icon: BarChart3,
    badge: 'Interactive',
    title: 'Live Polls & Surveys',
    description:
      'Engage your audience with real-time polls and surveys. Capture viewer responses and display styled, configurable results overlaid on your broadcast.',
    tags: ['Real-time', 'Analytics', 'Configurable'],
    large: false,
    accent: '#f59e0b',
  },
  {
    id: 'graphics',
    icon: Layers,
    badge: 'Drag & Drop',
    title: 'Graphics & Overlay Engine',
    description:
      'Layer bugs, astons, and L-bands over any video source with drag-and-drop simplicity. Full multi-layer compositing with per-source customization.',
    tags: ['Lower Thirds', 'Bugs', 'L-Bands', 'Astons'],
    large: false,
    accent: '#8b5cf6',
  },
  {
    id: 'studio',
    icon: Mic2,
    badge: 'Cloud Studio',
    title: 'Full Studio Experience on Cloud',
    description:
      'Broadcast-grade studio infrastructure delivered entirely in a browser. On-air talkbacks, IFB, virtual green rooms, and pre-air quality checks — all without a single rack of hardware.',
    tags: ['Talkback', 'IFB', 'Green Room', 'No Hardware'],
    large: true,
    accent: '#06b6d4',
  },
  {
    id: 'social',
    icon: Share2,
    badge: '1-Click',
    title: 'Social Media Publishing',
    description:
      'Go live on Facebook and YouTube simultaneously with a single click. Real-time distribution to millions of viewers across every major platform.',
    tags: ['Facebook Live', 'YouTube Live'],
    large: false,
    accent: '#ec4899',
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <div
      id={`landing-feature-card-${feature.id}`}
      className={cn(
        'group relative rounded-2xl border border-primary-border bg-surface p-6 overflow-hidden',
        'hover:border-active-accent/30 hover:bg-surface-2 transition-all duration-300',
        'hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
        feature.large && 'md:col-span-2',
      )}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${feature.accent}55 40%, ${feature.accent}55 60%, transparent 100%)`,
        }}
      />

      {/* Hover corner glow */}
      <div
        className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `${feature.accent}12` }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-border shrink-0"
          style={{ background: `${feature.accent}12` }}
        >
          <Icon size={18} style={{ color: feature.accent }} />
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 font-mono"
          style={{
            color: feature.accent,
            borderColor: `${feature.accent}28`,
            background: `${feature.accent}10`,
          }}
        >
          {feature.badge}
        </span>
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-primary-text mb-2 leading-snug">
        {feature.title}
      </h3>
      <p className="text-base text-secondary-text leading-relaxed mb-4">
        {feature.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {feature.tags.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-md bg-component-bg border border-primary-border text-xs text-secondary-text font-mono"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FeaturesGrid() {
  return (
    <section id="features" className="relative bg-primary-bg py-28 overflow-hidden">
      {/* Subtle top-center radial glow — CloudReel brand */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(48,49,203,0.06) 0%, transparent 65%)',
        }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <div className="text-xs tracking-[0.3em] text-active-accent uppercase mb-4 font-mono">
            Platform Capabilities
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-primary-text leading-[0.9] mb-4">
            EVERYTHING YOU NEED
            <br />
            <span className="text-secondary-text">TO GO LIVE.</span>
          </h2>
          <p className="text-secondary-text text-base leading-relaxed">
            Seven broadcast-grade capabilities, unified in a single cloud platform. From ingest to delivery.
          </p>
        </div>

        {/* Bento grid — 3 columns, large cards span 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
        </div>
      </div>
    </section>
  )
}
