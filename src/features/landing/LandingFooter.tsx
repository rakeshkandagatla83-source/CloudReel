import { Link } from 'react-router-dom'
import { useTheme } from '../../components/ThemeProvider'

export function LandingFooter() {
  const { theme } = useTheme()
  const logoSrc = theme === 'dark' ? '/CloudReel-white.png' : '/CloudReel.png'

  return (
    <footer id="landing-footer" className="bg-secondary-bg border-t border-primary-border pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-4 max-w-xs">
            <img src={logoSrc} alt="CloudReel" className="h-7 w-auto self-start object-contain" />
            <p className="text-base text-secondary-text leading-relaxed">
              Enterprise live video production infrastructure, delivered entirely on cloud. Create.
              Produce. Broadcast — at any scale.
            </p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-active-accent animate-pulse" />
              <span className="text-sm text-muted-text tracking-[0.2em] uppercase font-mono">
                Cloud Producer v4.0
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            <div>
              <div className="text-sm tracking-[0.22em] text-muted-text uppercase mb-4 font-semibold font-mono">
                Platform
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Protocols', href: '#protocols' },
                  { label: 'Studio', href: '#studio' },
                  { label: 'Demo', href: '#demo' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-base text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm tracking-[0.22em] text-muted-text uppercase mb-4 font-semibold font-mono">
                Company
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'About Janya', href: 'https://www.janya.video' },
                  { label: 'Contact Sales', href: 'mailto:sales@janya.video' },
                  { label: 'Support', href: 'mailto:support@janya.video' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    className="text-base text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm tracking-[0.22em] text-muted-text uppercase mb-4 font-semibold font-mono">
                Legal
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    label: 'Privacy Policy',
                    href: 'https://studio.janya.video/privacy-policy',
                  },
                  {
                    label: 'Terms & Conditions',
                    href: 'https://studio.janya.video/terms-and-conditions',
                  },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    className="text-base text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-primary-border">
          <p className="text-sm text-muted-text font-mono">
            © 2026 CloudReel. All rights reserved.
          </p>
          <Link
            to="/login"
            className="text-sm text-active-accent hover:opacity-80 transition-opacity cursor-pointer font-medium"
          >
            Sign in to CloudReel →
          </Link>
        </div>
      </div>
    </footer>
  )
}
