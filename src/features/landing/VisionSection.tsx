import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { GradientText } from './ui/GradientText'
import { viewportOnce } from './motionPresets'

const quoteWords = "Professional broadcasting should no longer require a ".split(" ")
const highlightWords = "professional broadcast team.".split(" ")

const wordContainer: import('motion/react').Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

const wordReveal: import('motion/react').Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function VisionSection() {
  return (
    <section id="landing-vision" className="relative py-[clamp(120px,15vw,200px)] bg-bg overflow-hidden flex items-center justify-center min-h-[60vh]">
      {/* Slow glow pulse */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at center, rgba(48,49,203,0.15) 0%, transparent 60%)',
          animation: 'pulseGlow 8s ease-in-out infinite alternate'
        }}
      />

      <div className="relative z-10 mx-auto max-w-[940px] px-6 lg:px-8 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-10"
        >
          <Eyebrow>Our Vision</Eyebrow>
        </motion.div>
        
        <motion.blockquote
          variants={wordContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-[clamp(32px,5vw,64px)] font-black text-ink uppercase leading-[1.1] tracking-[-0.02em] mx-auto max-w-4xl"
        >
          <span className="sr-only">
            Professional broadcasting should no longer require a professional broadcast team.
          </span>
          <div aria-hidden="true" className="flex flex-wrap justify-center gap-x-[0.25em] gap-y-2">
            {quoteWords.map((word, i) => (
              <span key={`w-${i}`} className="overflow-hidden inline-flex">
                <motion.span variants={wordReveal} className="inline-block">
                  {word}
                </motion.span>
              </span>
            ))}
            {highlightWords.map((word, i) => (
              <span key={`hw-${i}`} className="overflow-hidden inline-flex">
                <motion.span variants={wordReveal} className="inline-block">
                  <GradientText>{word}</GradientText>
                </motion.span>
              </span>
            ))}
          </div>
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-12 text-muted font-mono tracking-widest uppercase text-sm"
        >
          — CloudReel
        </motion.div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.3; }
          100% { transform: scale(1.1); opacity: 0.6; }
        }
      `}</style>
    </section>
  )
}
