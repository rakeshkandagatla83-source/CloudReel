import { motion } from 'motion/react'
import {
  Clapperboard,
  ClipboardList,
  Brush,
  Camera,
  AudioWaveform,
  Scissors,
  Share2,
  Languages,
} from 'lucide-react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'

const CREW = [
  {
    role: 'Director',
    title: 'AI Director',
    desc: 'Switches cameras, active-speaker, dynamic layouts',
    icon: Clapperboard,
    bg: 'bg-brand-indigo',
  },
  {
    role: 'Producer',
    title: 'AI Producer',
    desc: 'Rundowns, playlists, schedule',
    icon: ClipboardList,
    bg: 'bg-indigo-600',
  },
  {
    role: 'Graphics',
    title: 'AI Graphics',
    desc: 'Lower-thirds, scoreboards, sponsors',
    icon: Brush,
    bg: 'bg-violet-600',
  },
  {
    role: 'Camera',
    title: 'AI Camera Op',
    desc: 'Face tracking, reframe per aspect ratio',
    icon: Camera,
    bg: 'bg-purple-600',
  },
  {
    role: 'Audio',
    title: 'AI Audio',
    desc: 'Levels, denoise, voice enhance',
    icon: AudioWaveform,
    bg: 'bg-fuchsia-600',
  },
  {
    role: 'Editor',
    title: 'AI Editor',
    desc: 'Live highlight & vertical clips',
    icon: Scissors,
    bg: 'bg-brand-magenta',
  },
  {
    role: 'Social',
    title: 'AI Social',
    desc: 'Simulcast YouTube/IG/LinkedIn/X/Twitch/OTT',
    icon: Share2,
    bg: 'bg-pink-600',
  },
  {
    role: 'Translator',
    title: 'AI Translator',
    desc: 'Subtitles, voice translation, lip-sync',
    icon: Languages,
    bg: 'bg-rose-600',
  },
]

export function AICrewSection() {
  return (
    <section id="landing-crew" className="py-[clamp(64px,9vw,120px)] bg-bg-tint border-y border-line">
      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="max-w-3xl mb-16">
          <motion.div variants={revealItem}>
            <Eyebrow>Your AI Production Crew</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6 mb-6"
          >
            The whole control room. Automated.
          </motion.h2>
          
          <motion.p variants={revealItem} className="text-muted text-lg">
            Every role a broadcast team relies on, handled by AI — working together on every show.
          </motion.p>
        </div>

        <motion.div 
          id="landing-crew-grid"
          variants={revealContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {CREW.map((member) => (
            <motion.div
              key={member.role}
              variants={revealItem}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              id={`landing-crew-card-${member.role.toLowerCase()}`}
              className={`p-6 flex flex-col gap-4 rounded-2xl ${member.bg} shadow-md border border-white/10`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner">
                <member.icon 
                  className="w-6 h-6 text-white"
                  strokeWidth={2}
                />
              </div>
              <div className="mt-2">
                <h3 className="font-bold !text-white text-lg mb-1">{member.title}</h3>
                <p className="!text-white/90 text-sm leading-relaxed">{member.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
