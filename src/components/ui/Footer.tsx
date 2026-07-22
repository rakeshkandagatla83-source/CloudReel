import { env } from '../../lib/env'

export function Footer() {
  return (
    <footer id="footer" className="w-full border-t border-primary-border bg-secondary-bg px-6 py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 sm:flex-row">
        <p className="text-[11px] text-muted-text font-mono">
          © 2026 CloudReel. All rights reserved.
          {(env.envLabel == 'dev' || env.envLabel == 'uat') && (
            <span className="ml-2 rounded px-1.5 py-0.5 bg-component-bg text-secondary-text uppercase tracking-wider">
              {env.envLabel}
            </span>
          )}
        </p>
        <div className="flex items-center gap-4">
          <a
            id="footer-link-privacy"
            href={`https://studio.janya.video/privacy-policy`}
            target='_blank'
            className="text-[11px] font-mono text-active-accent/80 hover:text-active-accent transition-colors cursor-pointer"
          >
            Privacy Policy
          </a>
          <span className="text-muted-text text-[11px]">|</span>
          <a
            id="footer-link-terms"
            href={`https://studio.janya.video/terms-and-conditions`}
            target='_blank'
            className="text-[11px] font-mono text-active-accent/80 hover:text-active-accent transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </a>
        </div>
      </div>
    </footer>
  )
}
