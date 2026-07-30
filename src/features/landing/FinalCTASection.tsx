import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { Button } from './ui/Button'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

export function FinalCTASection() {
  return (
    <section id="landing-final-cta" className="relative py-[clamp(80px,12vw,160px)] overflow-hidden bg-bg">
      {/* Blueprint Grid BG */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50" 
        style={{
          backgroundImage: 'linear-gradient(var(--color-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Strong radial brand glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none mix-blend-multiply opacity-20"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-indigo) 0%, transparent 60%)',
          animation: 'pulseStrong 6s ease-in-out infinite alternate'
        }}
      />

      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[940px] px-6 lg:px-8 text-center"
      >
        <motion.div variants={revealItem} className="flex justify-center mb-6">
          <Eyebrow hasPill>One person. One camera. Unlimited production.</Eyebrow>
        </motion.div>
        
        <motion.h2
          variants={revealItem}
          className="text-[clamp(36px,5vw,64px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mb-6"
        >
          Launch your live channel on cloud.
        </motion.h2>
        
        <motion.p variants={revealItem} className="text-muted text-lg lg:text-xl max-w-2xl mx-auto mb-10">
          Talk to our broadcast experts — from concept to air.
        </motion.p>
        
        <motion.div variants={revealItem} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button id="landing-btn-request-demo" variant="primary" size="lg" className="w-full sm:w-auto overflow-hidden relative group">
            <span className="relative z-10">Request a Demo</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Button>
          <Button id="landing-btn-contact-sales" variant="ghost" size="lg" className="w-full sm:w-auto bg-surface">
            Contact Sales
          </Button>
        </motion.div>
        
        <motion.div 
          variants={revealItem}
          className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[11px] font-mono tracking-widest uppercase text-muted-2 font-semibold"
        >
          <a href="mailto:sales@janya.video" className="hover:text-brand-indigo transition-colors">
            sales@janya.video
          </a>
          <span className="hidden sm:inline opacity-30">·</span>
          <a href="tel:+919702173996" className="hover:text-brand-indigo transition-colors">
            +91-97021 73996
          </a>
          <span className="hidden sm:inline opacity-30">·</span>
          <a href="tel:+919881491028" className="hover:text-brand-indigo transition-colors">
            +91-98814 91028
          </a>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes pulseStrong {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.15; }
          100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.3; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  )
}
