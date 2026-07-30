import { LandingNavbar } from '../components/LandingNavbar'
import { HeroSection } from '../features/landing/HeroSection'
import { ValueSection } from '../features/landing/ValueSection'
import { CapabilitiesSection } from '../features/landing/CapabilitiesSection'
import { ProtocolsSection } from '../features/landing/ProtocolsSection'
import { AICrewSection } from '../features/landing/AICrewSection'
import { IntelligenceStack } from '../features/landing/IntelligenceStack'
import { ShowcaseSection } from '../features/landing/ShowcaseSection'
import { ComparisonSection } from '../features/landing/ComparisonSection'
import { BenefitsSection } from '../features/landing/BenefitsSection'
import { AudienceSection } from '../features/landing/AudienceSection'
import { MediaOSSection } from '../features/landing/MediaOSSection'
import { VisionSection } from '../features/landing/VisionSection'
import { FinalCTASection } from '../features/landing/FinalCTASection'
import { LandingFooter } from '../features/landing/LandingFooter'

export function LandingPage() {
  return (
    <div id="landing-root" className="min-h-screen bg-bg selection:bg-brand-indigo/20 selection:text-brand-indigo">
      <span id="top" aria-hidden="true" className="absolute top-0" />
      <LandingNavbar />
      <main id="landing-main">
        <HeroSection />
        <ValueSection />
        <CapabilitiesSection />
        <ProtocolsSection />
        <AICrewSection />
        <IntelligenceStack />
        <ShowcaseSection />
        <ComparisonSection />
        <BenefitsSection />
        <AudienceSection />
        <MediaOSSection />
        <VisionSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
