import { LandingNavbar } from '../components/LandingNavbar'
import { HeroSection } from '../features/landing/HeroSection'
import { FeaturesGrid } from '../features/landing/FeaturesGrid'
import { ProtocolsSection } from '../features/landing/ProtocolsSection'
import { DemoSection } from '../features/landing/DemoSection'
import { LandingFooter } from '../features/landing/LandingFooter'

export function LandingPage() {
  return (
    <div id="landing-root" className="min-h-screen bg-primary-bg">
      <LandingNavbar />
      <main id="landing-main">
        <HeroSection />
        <FeaturesGrid />
        <ProtocolsSection />
        <DemoSection />
      </main>
      <LandingFooter />
    </div>
  )
}
