import { useState } from 'react'
import { Instagram, Facebook, Youtube, Linkedin, ArrowRight, Check } from 'lucide-react'

const FOOTER_NAV = {
  Products: [
    { label: 'Capabilities', href: '#landing-capabilities' },
    { label: 'AI Studio', href: '#landing-multiviewer' },
    { label: 'AI Crew', href: '#landing-crew' },
    { label: 'AI Playout', href: '#landing-mediaos' },
    { label: 'Media OS', href: '#landing-mediaos' },
    { label: 'Solutions', href: '#landing-audience' },
  ],
  Resources: [
    { label: 'Blog', href: '#' },
    { label: 'Customer Stories', href: '#' },
    { label: 'Guides', href: '#' },
    { label: 'Community', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Docs', href: '#' },
    { label: 'Support', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Partners', href: '#' },
    { label: 'Trust Center', href: '#' },
    { label: 'Book a Demo', href: '#landing-final-cta' },
    { label: 'Events', href: '#' },
  ],
}

// Custom X (Twitter) SVG Icon
function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Custom Pinterest SVG Icon
function PinterestIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026l.032-.026z" />
    </svg>
  )
}

export function LandingFooter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setTimeout(() => setSubscribed(false), 4000)
      setEmail('')
    }
  }

  const SOCIAL_LINKS = [
    { label: 'Instagram', icon: Instagram, href: '#' },
    { label: 'Facebook', icon: Facebook, href: '#' },
    { label: 'YouTube', icon: Youtube, href: '#' },
    { label: 'LinkedIn', icon: Linkedin, href: '#' },
    { label: 'X (Twitter)', icon: XIcon, href: '#' },
    { label: 'Pinterest', icon: PinterestIcon, href: '#' },
  ]

  return (
    <footer id="landing-footer" className="bg-[#060B14] text-white border-t border-white/10 pt-16 lg:pt-24 pb-12 overflow-hidden font-sans">
      <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
        
        {/* Top 4-Column Navigation & Newsletter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10 pb-16 border-b border-white/15">
          
          {/* Products Col */}
          <div>
            <h4 className="text-base font-extrabold text-white mb-6 uppercase tracking-wider">
              Products
            </h4>
            <ul className="space-y-3.5">
              {FOOTER_NAV.Products.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Col */}
          <div>
            <h4 className="text-base font-extrabold text-white mb-6 uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-3.5">
              {FOOTER_NAV.Resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Col */}
          <div>
            <h4 className="text-base font-extrabold text-white mb-6 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3.5">
              {FOOTER_NAV.Company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Socials Col */}
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-extrabold text-white mb-3 leading-snug">
                Sign up for our newsletter to stay up to date
              </h4>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                Get the latest CloudReel updates, features, and release notes.
              </p>
            </div>

            {/* Newsletter Input Form */}
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#1E293B] border border-slate-700 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo transition-all"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {subscribed ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Subscribed!
                    </>
                  ) : (
                    <>
                      Subscribe <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Social Links Row */}
            <div className="pt-2">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold mb-3">
                Follow Us
              </div>
              <div className="flex items-center gap-2.5">
                {SOCIAL_LINKS.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className="w-9 h-9 rounded-lg bg-[#1E293B] hover:bg-brand-indigo border border-slate-700 hover:border-brand-indigo text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm"
                    >
                      <IconComponent className="w-4 h-4" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Massive Outlined Brand Logo (CR Symbol + CloudReel Text - 100% Width) */}
        <div className="py-12 lg:py-16 border-b border-white/15 flex items-center justify-center">
          <svg className="w-full h-auto max-h-[180px] overflow-visible select-none" viewBox="0 0 1050 160" fill="none">
            <defs>
              <linearGradient id="footerBrandOutlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D300EA" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#3B38D0" />
              </linearGradient>
            </defs>

            {/* CR Logo Icon Outline */}
            <g transform="translate(10, 10) scale(5.8)">
              <path 
                d="M22.74,19.02h-3.94c-.09,0-.17-.04-.22-.12l-2.22-3.31c-.06-.09-.06-.22.01-.31l1.01-1.28c.05-.06.13-.1.21-.1.15,0,.39,0,.53,0,.75,0,1.36-.52,1.36-1.17s-.61-1.15-1.36-1.17c-.75-.02-1.26.72-1.28.77l-1.96,2.63-.66.89s-1.48,2.03-4.01,2.78c-.77.26-1.61.38-2.47.35-3.63-.13-6.6-3.09-6.74-6.72-.16-4,3.04-7.3,7.01-7.3,2.37,0,4.47,1.18,5.74,2.99.09.12.07.29-.04.39-.07.07-.14.13-.21.2,0,0,0,0,0-.01-.69.64-1.2,1.43-1.93,2.48-.12.18-.4.14-.46-.06-.45-1.35-1.76-2.31-3.28-2.23-1.69.1-3.04,1.5-3.06,3.19-.03,1.82,1.44,3.31,3.25,3.31,0,0,0,0,.01,0,0,0,0,0,0,0,0,0,.01,0,.02,0,0,0,0,0,.01,0,.03,0,.08,0,.13,0,0,0,.01,0,.02,0,.03,0,.06,0,.1,0,0,0,.02,0,.03,0,.05,0,.1-.01.16-.02.02,0,.04,0,.06,0,.01,0,.03,0,.04,0,.01,0,.02,0,.04,0,.01,0,.02,0,.04,0,.05,0,.1-.02.16-.03.87-.18,2.25-.68,3.23-2.04,1.11-1.53,1.69-2.59,2.57-3.4,0,0,0,0,0,.01.84-.85,2.09-1.39,3.48-1.39,2.52,0,4.55,1.75,4.55,3.91,0,1.24-.68,2.35-1.73,3.07-.12.08-.15.25-.07.36l2.07,2.94c.12.17,0,.41-.21.41Z"
                stroke="url(#footerBrandOutlineGrad)"
                strokeWidth="0.6"
                fill="none"
              />
            </g>

            {/* CloudReel Text Outline */}
            <text
              x="165"
              y="52%"
              dominantBaseline="central"
              stroke="url(#footerBrandOutlineGrad)"
              strokeWidth="2.5"
              fill="none"
              className="font-black tracking-tight uppercase text-[125px] font-sans opacity-80 hover:opacity-100 transition-opacity duration-300"
            >
              CloudReel
            </text>
          </svg>
        </div>

        {/* Bottom Bar: Operational Status & Legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-slate-200 font-semibold">All systems operational</span>
          </div>

          <div className="flex items-center gap-6 text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Privacy policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of service</a>
            <span className="text-slate-400">© 2026 CloudReel</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
