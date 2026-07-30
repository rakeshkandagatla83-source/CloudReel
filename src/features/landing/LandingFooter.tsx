import { Link } from 'react-router-dom'
import { useTheme } from '../../components/ThemeProvider'

const FOOTER_LINKS = {
  Platform: [
    { label: 'Capabilities', href: '#landing-capabilities' },
    { label: 'AI Crew', href: '#landing-crew' },
    { label: 'How it works', href: '#landing-stack' },
    { label: 'Media OS', href: '#landing-mediaos' },
  ],
  Solutions: [
    { label: 'Creators', href: '#landing-audience' },
    { label: 'Broadcasters', href: '#landing-audience' },
    { label: 'Enterprise', href: '#landing-benefits' },
    { label: 'Education', href: '#landing-audience' },
  ],
  Company: [
    { label: 'Vision', href: '#landing-vision' },
    { label: 'Book a demo', href: '#landing-final-cta' },
    { label: 'Start free trial', href: '#' },
  ],
}

export function LandingFooter() {
  const { theme } = useTheme()
  const logoSrc = theme === 'dark' ? '/CloudReel-white.png' : '/CloudReel.png'

  return (
    <footer id="landing-footer" className="bg-bg-tint border-t border-line py-16 lg:py-24">
      <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
          {/* Brand Col */}
          <div className="col-span-2 lg:col-span-2 pr-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo rounded-sm">
              <img src={logoSrc} alt="CloudReel" className="h-7 w-auto" />
            </Link>
            
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              The AI operating system for live production. <br/>
              <strong className="text-ink font-semibold">Formerly Janya.</strong>
            </p>
          </div>

          {/* Link Cols */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} id={`landing-footer-col-${title.toLowerCase()}`}>
              <div className="text-[11px] font-mono tracking-widest uppercase text-ink font-bold mb-6">
                {title}
              </div>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <a 
                      href={link.href}
                      className="text-sm text-muted hover:text-brand-indigo transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo rounded-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-muted font-mono uppercase tracking-wider">
            © 2026 CloudReel
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-magenta" />
            <span className="text-xs text-muted-2 font-mono uppercase tracking-wider">
              Built for live.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
