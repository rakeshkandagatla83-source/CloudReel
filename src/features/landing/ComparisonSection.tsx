import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const TRADITIONAL = [
  'Expensive hardware',
  'Multiple software licenses',
  'Large production teams',
  'Long setup times',
  'Limited scalability',
  'High operational costs',
]

const CLOUDREEL = [
  'Runs entirely in browser',
  'AI-assisted workflows',
  'Remote collaboration',
  'Live in minutes',
  'Scales without hardware',
  'Fraction of the cost',
]

const drawIcon = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { duration: 0.8 }
  }
}

export function ComparisonSection() {
  return (
    <section id="landing-comparison" className="py-[clamp(64px,9vw,120px)] bg-bg">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div variants={revealItem}>
            <Eyebrow>Why teams switch</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6"
          >
            Broadcast quality, without the broadcast overhead.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          {/* Traditional Card */}
          <motion.div
            id="landing-cmp-old"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="bg-bg-tint rounded-2xl border border-line p-8 lg:p-10"
          >
            <div className="text-sm font-mono tracking-widest uppercase text-muted mb-8 font-bold">
              Traditional Production
            </div>
            
            <ul className="space-y-5">
              {TRADITIONAL.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-red-100/50">
                    <motion.svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3"
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="w-3 h-3 text-red-500"
                    >
                      <motion.path variants={drawIcon} d="M18 6 6 18" />
                      <motion.path variants={drawIcon} d="m6 6 12 12" />
                    </motion.svg>
                  </div>
                  <span className="text-muted line-through decoration-muted/30">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* CloudReel Card */}
          <motion.div
            id="landing-cmp-new"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden p-[2px] shadow-2xl shadow-brand-indigo/10"
          >
            {/* Moving Glowing Border (Spinning Background) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute -inset-[150%] opacity-80"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 240deg, var(--color-brand-magenta) 300deg, var(--color-brand-indigo) 360deg)'
              }}
            />

            {/* Inner Glass Card */}
            <div className="relative h-full bg-surface/90 backdrop-blur-2xl rounded-[14px] border border-white/20 p-8 lg:p-10 flex flex-col">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-brand-magenta/5 to-brand-indigo/5 pointer-events-none" />
              
              <div className="relative text-sm font-mono tracking-widest uppercase text-brand-indigo mb-8 font-bold">
                CloudReel AI Studio
              </div>
              
              <ul className="relative space-y-5">
                {CLOUDREEL.map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-brand-grad shadow-sm shadow-brand-indigo/30">
                      <motion.svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="w-3 h-3 text-white"
                      >
                        <motion.path variants={drawIcon} d="M20 6 9 17l-5-5" />
                      </motion.svg>
                    </div>
                    <span className="text-ink font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
