import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { Card } from './ui/Card'
import { Counter } from './ui/Counter'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'
import { GradientText } from './ui/GradientText'

export function BenefitsSection() {
  return (
    <section id="landing-benefits" className="py-[clamp(64px,9vw,120px)] bg-bg-tint border-b border-line">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="max-w-3xl mb-12">
          <motion.div variants={revealItem}>
            <Eyebrow>Why enterprises choose CloudReel</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6"
          >
            Do more, with fewer people, for less.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Hero Stat - spans 2 cols on desktop */}
          <motion.div
            variants={revealItem}
            id="landing-benefit-cost"
            className="md:col-span-3 lg:col-span-2 bg-surface rounded-2xl border border-line p-8 md:p-12 relative overflow-hidden shadow-sm"
          >
            {/* Animated Gradient Drift */}
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'var(--brand-grad)',
                backgroundSize: '200% 200%',
                animation: 'drift 8s ease infinite alternate'
              }}
            />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <div className="text-[11px] font-mono tracking-widest uppercase text-brand-indigo font-bold mb-4">
                  Operational Savings
                </div>
                <div className="text-6xl md:text-8xl font-black text-ink tracking-tight mb-2">
                  <GradientText>
                    Up to <Counter value={80} suffix="%" />
                  </GradientText>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-ink">
                  Lower live-production costs.
                </h3>
              </div>
              
              <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-line pt-6 md:pt-0 md:pl-8">
                <p className="text-muted text-sm leading-relaxed">
                  Eliminate the need for physical studios, massive crews, OB vans, and endless hardware refresh cycles.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Secondary Stats */}
          <Card id="landing-benefit-speed" className="flex flex-col justify-center p-8">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-2 font-bold mb-4">
              Time to Air
            </div>
            <div className="text-4xl font-black text-ink tracking-tight mb-2">
              <GradientText>Minutes</GradientText>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Launch a fully branded linear channel in minutes, not months.
            </p>
          </Card>
          
          <Card id="landing-benefit-scale" className="flex flex-col justify-center p-8">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-2 font-bold mb-4">
              Scale
            </div>
            <div className="text-4xl font-black text-ink tracking-tight mb-2">
              <GradientText>Global</GradientText>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Scale worldwide instantly without shipping or installing hardware.
            </p>
          </Card>
          
          <Card id="landing-benefit-remote" className="flex flex-col justify-center p-8">
            <div className="text-[11px] font-mono tracking-widest uppercase text-muted-2 font-bold mb-4">
              Access
            </div>
            <div className="text-4xl font-black text-ink tracking-tight mb-2">
              <GradientText>Remote</GradientText>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Produce from anywhere. All you need is a browser and an internet connection.
            </p>
          </Card>
        </div>
      </motion.div>
      
      {/* Drift animation definition */}
      <style>{`
        @keyframes drift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  )
}
