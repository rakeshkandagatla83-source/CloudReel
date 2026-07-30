import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { Card } from './ui/Card'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const MODULES = [
  { slug: 'studio', tag: 'Core', title: 'AI Studio', desc: 'Live production and vision mixing.' },
  { slug: 'producer', tag: 'Planning', title: 'AI Producer', desc: 'Rundown automation and scheduling.' },
  { slug: 'playout', tag: 'Linear', title: 'AI Playout', desc: '24×7 channel scheduling & playout.' },
  { slug: 'asset', tag: 'Storage', title: 'AI Asset Manager', desc: 'Library, QC, and rich metadata.' },
  { slug: 'monetization', tag: 'Revenue', title: 'AI Monetization', desc: 'Ads, SCTE markers, and FAST.' },
  { slug: 'distribution', tag: 'Delivery', title: 'AI Distribution Hub', desc: 'OTT, social, and syndication.' },
  { slug: 'insights', tag: 'Data', title: 'AI Insights', desc: 'Analytics and audience engagement.' },
]

export function MediaOSSection() {
  return (
    <section id="landing-mediaos" className="py-[clamp(64px,9vw,120px)] bg-bg-tint border-y border-line">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {MODULES.map((mod) => (
            <Card
              key={mod.slug}
              id={`landing-module-${mod.slug}`}
              className="relative overflow-hidden p-6 flex flex-col justify-center group"
            >
              {/* Left Accent Bar */}
              <motion.div 
                className="absolute left-0 top-0 bottom-0 w-1 bg-brand-grad origin-top"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={viewportOnce}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
              
              <div className="pl-3">
                <div className="text-[10px] font-mono tracking-widest uppercase text-muted-2 font-bold mb-3">
                  {mod.tag}
                </div>
                <h3 className="font-semibold text-ink text-lg mb-1 group-hover:text-brand-indigo transition-colors">
                  {mod.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            </Card>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
