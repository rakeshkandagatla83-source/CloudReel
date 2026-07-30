import { motion } from 'motion/react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const SHOWCASES = [
  {
    slug: 'news',
    title: 'Live News',
    meta: 'Studio · Lower-thirds · Ticker',
    grad: 'from-blue-600 to-indigo-900',
  },
  {
    slug: 'sports',
    title: 'Sports & Events',
    meta: 'Multi-cam · Replay · Scoreboard',
    grad: 'from-emerald-600 to-teal-900',
  },
  {
    slug: 'worship',
    title: 'Worship & Community',
    meta: 'Multi-language · Captions',
    grad: 'from-amber-500 to-orange-800',
  },
  {
    slug: 'webinars',
    title: 'Webinars & Town Halls',
    meta: 'Remote guests · Slides',
    grad: 'from-purple-600 to-fuchsia-900',
  },
  {
    slug: 'podcasts',
    title: 'Podcasts & Shows',
    meta: 'Auto-clips · Vertical cuts',
    grad: 'from-rose-500 to-pink-800',
  },
  {
    slug: 'education',
    title: 'Education & Training',
    meta: 'Recordings · Translation',
    grad: 'from-cyan-600 to-blue-900',
  },
]

export function ShowcaseSection() {
  return (
    <section id="landing-showcase" className="py-[clamp(64px,9vw,120px)] bg-bg-tint border-y border-line">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="mb-16 max-w-3xl">
          <motion.div variants={revealItem}>
            <Eyebrow>In production everywhere</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 mb-6"
          >
            One platform. Every kind of live.
          </motion.h2>
          
          <motion.p variants={revealItem} className="text-muted text-lg">
            From studio news to stadium sport — any format, any aspect ratio, any platform.
          </motion.p>
        </div>

        <motion.div 
          id="landing-showcase-grid"
          variants={revealContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SHOWCASES.map((item) => (
            <motion.div
              key={item.slug}
              variants={revealItem}
              id={`landing-showcase-tile-${item.slug}`}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-line shadow-sm hover:shadow-md hover:border-brand-indigo/30"
            >
              {/* Image Background */}
              <img 
                src={`/images/showcase-${item.slug}.jpg`} 
                alt={item.title}
                className="absolute inset-0 z-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  // Fallback to gradient if image is missing
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              
              {/* Fallback Placeholder (shown if image fails to load) */}
              <div 
                className={`absolute inset-0 z-0 bg-gradient-to-br ${item.grad} opacity-80 mix-blend-multiply`} 
                style={{ display: 'none' }}
              />
              
              {/* Scrim for text readability */}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              
              {/* LIVE Chip */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 backdrop-blur-md border border-white/20">
                <div className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider shadow-sm">
                  LIVE
                </span>
              </div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 z-20 pointer-events-none">
                <h3 className="text-xl font-bold !text-white mb-1 drop-shadow-md">
                  {item.title}
                </h3>
                <div className="text-[11px] font-mono !text-white uppercase tracking-widest drop-shadow-md">
                  {item.meta}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
