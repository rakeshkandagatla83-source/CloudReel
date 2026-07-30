import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Radio, Users, MonitorPlay, Layers, BarChart, Mic, Share2, 
  Sparkles, Activity, CheckCircle2, Zap, Eye, Wifi, ArrowRight
} from 'lucide-react'
import { Eyebrow } from './ui/Eyebrow'
import { revealContainer, revealItem, viewportOnce } from './motionPresets'
import { GUEST_VIDEOS } from './guestRoster'

const LAYERS = [
  {
    num: '01',
    verb: 'Produce',
    title: 'AI Director',
    desc: 'Switches cameras, manages layouts, and follows the action.',
    icon: Radio,
    color: 'var(--color-brand-indigo)',
  },
  {
    num: '02',
    verb: 'Understand',
    title: 'AI Vision',
    desc: 'Recognizes faces, active speakers, gestures, and brand logos.',
    icon: Eye,
    color: 'var(--color-brand-magenta)',
  },
  {
    num: '03',
    verb: 'Brand',
    title: 'AI Graphics',
    desc: 'Context-aware lower thirds, data overlays, and scoreboards.',
    icon: Layers,
    color: 'var(--color-brand-indigo)',
  },
  {
    num: '04',
    verb: 'Clip',
    title: 'AI Content IQ',
    desc: 'Auto-generates highlights and vertical cuts in real-time.',
    icon: Zap,
    color: 'var(--color-brand-magenta)',
  },
  {
    num: '05',
    verb: 'Deliver',
    title: 'AI Distribution',
    desc: 'Optimizes encodes and simulcasts to every major platform.',
    icon: Wifi,
    color: 'var(--color-brand-indigo)',
  },
  {
    num: '06',
    verb: 'Learn',
    title: 'AI Analytics',
    desc: 'Measures engagement and suggests content optimizations.',
    icon: Activity,
    color: 'var(--color-brand-magenta)',
  },
]

export function IntelligenceStack() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section id="landing-stack" className="relative py-[clamp(64px,9vw,120px)] bg-bg-tint/70 border-y border-line/50 overflow-hidden">
      {/* Tech Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-brand-indigo)_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.08] pointer-events-none" />
      
      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-brand-indigo/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-brand-magenta/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-brand-indigo/10 via-brand-magenta/10 to-brand-indigo/10 blur-[100px] pointer-events-none" />

      <motion.div
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-8"
      >
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <motion.div variants={revealItem}>
            <Eyebrow>How it works</Eyebrow>
          </motion.div>
          
          <motion.h2
            variants={revealItem}
            className="text-[clamp(28px,3.8vw,48px)] font-black text-ink uppercase leading-[1.05] tracking-[-0.02em] mt-6"
          >
            Most platforms give you tools. CloudReel gives you intelligence.
          </motion.h2>
        </div>

        {/* Split Screen Interactive Grid */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Side: Step Selection List */}
          <div className="lg:col-span-5 relative border-l-2 border-line pl-6 space-y-4">
            {LAYERS.map((layer, i) => {
              const isActive = activeStep === i
              return (
                <div
                  key={layer.num}
                  id={`landing-stack-row-${i + 1}`}
                  onMouseEnter={() => setActiveStep(i)}
                  onClick={() => setActiveStep(i)}
                  className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    isActive 
                      ? 'bg-surface shadow-lg border border-line scale-[1.02]' 
                      : 'hover:bg-surface/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Active Indicator Spine Pill */}
                  <div 
                    className={`absolute -left-[27px] top-1/2 -translate-y-1/2 w-2 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'h-8 bg-brand-indigo shadow-[0_0_12px_rgba(59,56,208,0.6)]' 
                        : 'h-2 bg-line group-hover:bg-brand-indigo/50'
                    }`} 
                  />

                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-brand-indigo font-bold">
                      {layer.num}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-mono font-semibold text-muted-2">
                      {layer.verb}
                    </span>
                    {isActive && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-brand-indigo font-bold">
                        ACTIVE <ArrowRight className="w-3 h-3 animate-pulse" />
                      </span>
                    )}
                  </div>

                  <h3 className={`text-lg font-bold transition-colors ${isActive ? 'text-ink' : 'text-muted'}`}>
                    {layer.title}
                  </h3>
                  
                  <p className="text-muted text-xs leading-relaxed mt-1">
                    {layer.desc}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Right Side: Dynamic Simulated UI Preview Window */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl border border-line bg-surface/90 backdrop-blur-xl shadow-2xl p-4 lg:p-6 overflow-hidden min-h-[420px] flex flex-col justify-between">
              {/* Top Window Chrome */}
              <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-xs text-muted-2 font-semibold">
                    cloudreel-studio // {LAYERS[activeStep].verb.toLowerCase()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo text-[11px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-ping" />
                  {LAYERS[activeStep].title}
                </div>
              </div>

              {/* Animated Content Preview Box */}
              <div className="relative flex-1 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full flex flex-col justify-center"
                  >
                    {/* STEP 0: AI DIRECTOR */}
                    {activeStep === 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-muted mb-1">
                          <span>MULTI-CAM DIRECTING</span>
                          <span className="text-live font-bold animate-pulse">● LIVE SWITCHING</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[0, 1, 2, 3].map((idx) => (
                            <div key={idx} className={`relative aspect-video rounded-lg overflow-hidden border ${idx === 0 ? 'border-live ring-2 ring-live/30' : 'border-line'}`}>
                              <video src={GUEST_VIDEOS[idx]} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-85" />
                              <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${idx === 0 ? 'bg-live text-white' : 'bg-black/60 text-white/70'}`}>
                                {idx === 0 ? 'ON AIR • CAM 1' : `CAM ${idx + 1}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STEP 1: AI VISION */}
                    {activeStep === 1 && (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-line bg-black/80">
                        <video src={GUEST_VIDEOS[0]} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
                        
                        {/* Computer Vision Detection Bounding Box */}
                        <div className="absolute inset-12 border-2 border-dashed border-brand-magenta rounded-lg flex flex-col justify-between p-2 animate-pulse">
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-0.5 bg-brand-magenta text-white font-mono text-[10px] font-bold rounded">
                              FACE RECOGNITION: SPEAKER 1 (98.4%)
                            </span>
                            <span className="px-2 py-0.5 bg-black/70 text-white font-mono text-[10px] rounded">
                              GESTURE: SPEAKING
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-black/70 text-brand-indigo font-mono text-[10px] rounded border border-brand-indigo/40">
                              BOUNDING BOX: ACTIVE
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: AI GRAPHICS */}
                    {activeStep === 2 && (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-line bg-black/90 p-4 flex flex-col justify-between">
                        <video src={GUEST_VIDEOS[1]} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        
                        <div className="relative z-10 flex justify-between">
                          <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-xs font-mono text-white flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-brand-magenta animate-spin" /> LIVE GRAPHICS OVERLAY
                          </div>
                          <div className="bg-brand-grad text-white px-3 py-1 rounded-md text-xs font-mono font-bold">
                            LIVE SCORE 2 - 1
                          </div>
                        </div>

                        {/* Lower Third Graphic */}
                        <div className="relative z-10 bg-brand-grad p-3 rounded-lg border border-white/20 shadow-xl max-w-sm">
                          <div className="text-white font-bold text-sm">ALEX MORGAN</div>
                          <div className="text-white/80 text-xs font-mono">Senior AI Media Engineer • CloudReel</div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: AI CONTENT IQ */}
                    {activeStep === 3 && (
                      <div className="flex gap-4 items-center justify-center h-full">
                        {/* 9:16 Preview Card */}
                        <div className="relative w-36 aspect-[9/16] rounded-xl overflow-hidden border-2 border-brand-magenta shadow-xl bg-black">
                          <video src={GUEST_VIDEOS[2]} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-brand-magenta text-white font-mono text-[9px] font-bold">
                            9:16 REELS
                          </div>
                          <div className="absolute bottom-3 inset-x-2 bg-black/70 p-1.5 rounded text-[10px] text-white font-mono leading-tight">
                            "Auto-clipped highlight..."
                          </div>
                        </div>

                        <div className="space-y-3 flex-1">
                          <div className="p-3 rounded-lg bg-surface border border-line space-y-1">
                            <div className="flex justify-between text-xs font-mono font-bold text-ink">
                              <span>VIRAL SCORE INDEX</span>
                              <span className="text-brand-magenta">98.2% HYPE</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-line overflow-hidden">
                              <div className="h-full bg-brand-grad w-[98%]" />
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-surface border border-line text-xs font-mono text-muted space-y-1">
                            <div className="text-brand-indigo font-bold">● AUTO HIGHLIGHT DETECTED</div>
                            <div>Duration: 00:24 • Key reaction segment</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 4: AI DISTRIBUTION */}
                    {activeStep === 4 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-mono text-muted mb-2 flex items-center justify-between">
                          <span>SIMULCAST PLATFORM TARGETS</span>
                          <span className="text-ok font-bold">● ALL SYSTEMS NOMINAL</span>
                        </div>
                        {[
                          { name: 'YouTube Live', rate: '1080p60 • 6.5 Mbps', status: 'HEALTHY' },
                          { name: 'Twitch TV', rate: '1080p60 • 6.0 Mbps', status: 'HEALTHY' },
                          { name: 'Facebook Live', rate: '1080p60 • 5.8 Mbps', status: 'HEALTHY' },
                          { name: 'Custom SRT Playout', rate: '4K30 • 12.0 Mbps', status: '0.1s LATENCY' }
                        ].map((target, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-line text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
                              <span className="font-bold text-ink">{target.name}</span>
                            </div>
                            <span className="text-muted">{target.rate}</span>
                            <span className="px-2 py-0.5 rounded bg-ok/10 text-ok font-bold text-[10px]">
                              {target.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* STEP 5: AI ANALYTICS */}
                    {activeStep === 5 && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-bold text-ink">REAL-TIME VIEWER RETENTION</span>
                            <span className="text-brand-indigo font-bold">+24.8% VS AVERAGE</span>
                          </div>
                          {/* Simulated Bar Chart */}
                          <div className="flex items-end gap-1.5 h-20 pt-4">
                            {[40, 55, 60, 45, 70, 85, 95, 88, 100, 92].map((height, i) => (
                              <div 
                                key={i} 
                                className="flex-1 bg-brand-grad rounded-t transition-all duration-500" 
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-brand-indigo/10 border border-brand-indigo/30 flex items-center gap-3">
                          <Zap className="w-5 h-5 text-brand-indigo shrink-0" />
                          <div className="text-xs font-mono text-ink">
                            <strong className="text-brand-indigo block">AI RECOMMENDATION:</strong>
                            Display Q&A lower-third now — engagement peak detected at 89%.
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Status Bar */}
              <div className="pt-3 border-t border-line flex items-center justify-between text-[11px] font-mono text-muted">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-indigo" /> Real-time Cloud Pipeline
                </span>
                <span>STEP {activeStep + 1} OF 6</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
