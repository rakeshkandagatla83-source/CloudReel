import { useState } from 'react'
import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const AUDIENCES = [
  // Top
  { label: 'Independent creators', slug: 'creators', top: '12%', left: '18%', delay: 0.1, size: 'xl' as const },
  { label: 'FAST channels', slug: 'fast', top: '4%', left: '42%', delay: 0.9, size: 'sm' as const },
  { label: 'News publishers', slug: 'news', top: '15%', left: '68%', delay: 0.2, size: 'lg' as const },
  { label: 'Event organizers', slug: 'events', top: '25%', left: '3%', delay: 1.1, size: 'md' as const },
  // Middle
  { label: 'Sports orgs', slug: 'sports', top: '48%', left: '9%', delay: 0.3, size: 'lg' as const },
  { label: 'Universities', slug: 'universities', top: '75%', left: '16%', delay: 0.5, size: 'xl' as const },
  { label: 'Faith orgs', slug: 'faith', top: '35%', left: '85%', delay: 0.4, size: 'sm' as const },
  { label: 'Corporate comms', slug: 'corporate', top: '60%', left: '82%', delay: 0.6, size: 'xl' as const },
  // Bottom
  { label: 'Government', slug: 'government', top: '82%', left: '35%', delay: 0.7, size: 'lg' as const },
  { label: 'Podcast networks', slug: 'podcasts', top: '88%', left: '55%', delay: 1.0, size: 'sm' as const },
  { label: 'OTT platforms', slug: 'ott', top: '76%', left: '72%', delay: 0.8, size: 'md' as const }
]

export function AudienceSection() {
  return (
    <section id="landing-audience" className="py-[clamp(64px,9vw,120px)] bg-bg overflow-hidden">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1200px] px-6 lg:px-8 relative flex flex-col items-center justify-center lg:min-h-[750px] xl:min-h-[800px]"
      >
        {/* Center Title Container */}
        <div className="relative z-10 flex flex-col items-center text-center lg:max-w-xl mx-auto lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 mb-12 lg:mb-0">
          <motion.div variants={revealItem}>
            <Eyebrow>Built For</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(32px,4vw,56px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 pointer-events-none"
          >
            Run an entire channel<br/>
            <span className="text-brand-indigo">with one person.</span>
          </motion.h2>
        </div>
        
        {/* Floating Chips Container - Flex wrap on mobile, absolute orbit on desktop */}
        <div className="flex flex-wrap justify-center gap-6 lg:block w-full h-full">
          {AUDIENCES.map((audience) => (
            <Chip key={audience.slug} audience={audience} />
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function Chip({ audience }: { audience: typeof AUDIENCES[0] }) {
  const [imgError, setImgError] = useState(false);

  // Map predefined sizes to exact Tailwind utility classes
  const sizeClasses = {
    sm: {
      img: 'w-16 h-16 lg:w-20 lg:h-20 rounded-xl',
      badge: 'px-3 py-1 lg:px-3 lg:py-1 text-[9px] lg:text-[11px]'
    },
    md: {
      img: 'w-20 h-20 lg:w-28 lg:h-28 rounded-2xl',
      badge: 'px-3 py-1 lg:px-4 lg:py-1.5 text-[11px] lg:text-sm'
    },
    lg: {
      img: 'w-24 h-24 lg:w-36 lg:h-36 rounded-[20px]',
      badge: 'px-4 py-1.5 lg:px-5 lg:py-2 text-xs lg:text-[15px]'
    },
    xl: {
      img: 'w-28 h-28 lg:w-44 lg:h-44 rounded-3xl',
      badge: 'px-4 py-1.5 lg:px-6 lg:py-2 text-sm lg:text-base'
    }
  }[audience.size];

  return (
    <motion.div
      // Entry animation (pop-in on scroll)
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 20, 
        delay: audience.delay 
      }}
      className="lg:absolute relative"
      style={{
        // Only applies cleanly on lg screens due to positioning context
        top: audience.top,
        left: audience.left
      }}
    >
      <motion.div
        // Ambient "Heartbeat" / Floating animation
        animate={{ 
          y: [0, -10, 0], 
          scale: [1, 1.04, 1] 
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 4 + (audience.delay * 2), // varied duration for organic feel
          ease: "easeInOut" 
        }}
        className="relative flex flex-col items-center group cursor-default pb-4 lg:pb-3"
      >
        {/* Large Avatar Image with Fallback */}
        <div className={`${sizeClasses.img} overflow-hidden shrink-0 bg-brand-grad shadow-xl shadow-brand-indigo/10 border border-white/10 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-brand-indigo/40`}>
          {!imgError ? (
            <img 
              src={`/images/avatar-${audience.slug}.jpg`} 
              alt={audience.label}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white uppercase opacity-70">
              {audience.label.substring(0, 2)}
            </div>
          )}
        </div>
        
        {/* Overlapping Pill Badge */}
        <div className={`absolute bottom-0 lg:-bottom-2 ${sizeClasses.badge} rounded-full border border-white/20 bg-surface/90 backdrop-blur-md shadow-lg text-ink font-bold whitespace-nowrap transition-colors group-hover:border-brand-indigo/50`}>
          {audience.label}
        </div>
      </motion.div>
    </motion.div>
  )
}
