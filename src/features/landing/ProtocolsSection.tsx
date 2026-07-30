import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const PROTOCOLS = [
  { name: 'RTMP', desc: 'Real-Time Messaging Protocol' },
  { name: 'SRT', desc: 'Secure Reliable Transport' },
  { name: 'HLS', desc: 'HTTP Live Streaming' },
  { name: 'WebRTC', desc: 'Web Real-Time Communication' },
  { name: 'NDI', desc: 'Network Device Interface' },
  { name: 'ZIXI', desc: 'Zixi Broadcast Protocol' },
  { name: 'RTP', desc: 'Real-time Transport Protocol' },
  { name: 'RTSP', desc: 'Real Time Streaming Protocol' },
]

const DESTINATIONS = [
  'Facebook', 'YouTube', 'Twitch', 'Custom RTMP', 'OTT', 'CDN', 'Satellite Uplink', 'Linear TV'
]

export function ProtocolsSection() {
  return (
    <section id="landing-protocols" className="relative bg-bg py-[clamp(64px,9vw,120px)] overflow-hidden">
      {/* Blueprint Grid BG */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(var(--color-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative mx-auto max-w-[1180px] px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center"
      >
        <div>
          <motion.div variants={revealItem}>
            <Eyebrow>Supported Protocols</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 mb-6"
          >
            Speak every broadcast language.
          </motion.h2>
          
          <motion.p variants={revealItem} className="text-muted text-base leading-[1.65] mb-10">
            Native support for every major ingest & delivery protocol — no adapters, no workarounds.
          </motion.p>
          
          <motion.div variants={revealItem}>
            <div className="text-[11px] uppercase tracking-widest font-mono text-muted-2 font-bold mb-4">
              Publish To
            </div>
            <div className="flex flex-wrap gap-2">
              {DESTINATIONS.map((dest, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-full border border-line bg-surface text-ink text-sm font-medium hover:border-brand-indigo hover:text-brand-indigo transition-colors"
                >
                  {dest}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          id="landing-protocol-grid"
          variants={revealContainer} 
          className="grid grid-cols-2 gap-3"
        >
          {PROTOCOLS.map((p) => (
            <motion.div
              key={p.name}
              variants={revealItem}
              id={`landing-protocol-${p.name.toLowerCase()}`}
              className="group flex flex-col justify-center p-4 rounded-xl border border-line bg-surface hover:border-brand-indigo/30 hover:shadow-sm transition-all"
            >
              <div className="text-sm font-bold text-ink font-mono tracking-wide mb-1 group-hover:text-brand-indigo transition-colors">
                {p.name}
              </div>
              <div className="text-[13px] text-muted leading-tight">
                {p.desc}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
