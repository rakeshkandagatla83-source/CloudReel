import { ArrowRight, Mail, Phone } from 'lucide-react'

export function DemoSection() {
  return (
    <section id="demo" className="relative bg-primary-bg py-32 overflow-hidden border-t border-primary-border">
      {/* Center radial — CloudReel brand CTA energy */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(48,49,203,0.10) 0%, transparent 68%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-active-accent/25 bg-active-accent/8 mb-8 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-active-accent animate-ping" />
          <span className="text-[11px] text-active-accent tracking-[0.2em] uppercase font-semibold">
            Ready to Broadcast?
          </span>
        </div>

        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-primary-text leading-[0.9] mb-6">
          LAUNCH YOUR
          <br />
          <span className="cr-gradient-text">LIVE CHANNEL</span>
          <br />
          ON CLOUD.
        </h2>

        <p className="text-secondary-text text-lg max-w-lg mx-auto mb-12 leading-relaxed">
          Talk to our broadcast experts and see how CloudReel can transform your live video
          operations — from concept to air.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            id="landing-btn-demo-request"
            href="mailto:sales@janya.video"
            className="flex items-center gap-2.5 px-8 py-4 bg-active-accent hover:opacity-90 text-white font-semibold text-base rounded-xl transition-all cursor-pointer shadow-[0_0_60px_rgba(48,49,203,0.45)] hover:shadow-[0_0_80px_rgba(48,49,203,0.65)] w-full sm:w-auto justify-center"
          >
            Request a Demo
            <ArrowRight size={16} />
          </a>
          <a
            id="landing-btn-demo-contact"
            href="mailto:sales@janya.video"
            className="flex items-center gap-2 px-7 py-4 border border-primary-border hover:border-active-accent/40 text-secondary-text hover:text-primary-text rounded-xl transition-all cursor-pointer text-base hover:bg-component-bg w-full sm:w-auto justify-center"
          >
            <Mail size={15} />
            Contact Sales
          </a>
        </div>

        {/* Contact strip */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 border-t border-primary-border">
          <a
            href="mailto:sales@janya.video"
            className="flex items-center gap-2 text-secondary-text text-base hover:text-primary-text transition-colors cursor-pointer"
          >
            <Mail size={15} className="text-muted-text" />
            sales@janya.video
          </a>
          <div className="flex items-center gap-2 text-secondary-text text-base">
            <Phone size={15} className="text-muted-text" />
            +91-97021 73996
          </div>
          <div className="flex items-center gap-2 text-secondary-text text-base">
            <Phone size={15} className="text-muted-text" />
            +91-98814 91028
          </div>
        </div>
      </div>
    </section>
  )
}
