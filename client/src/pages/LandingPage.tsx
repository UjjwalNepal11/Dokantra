import PublicNavbar from './landing/PublicNavbar'
import HeroSection from './landing/HeroSection'
import ValueStrip from './landing/ValueStrip'
import FeaturesSection from './landing/FeaturesSection'
import HowItWorksSection from './landing/HowItWorksSection'
import DashboardPreview from './landing/DashboardPreview'
import BenefitsSection from './landing/BenefitsSection'
import CTASection from './landing/CTASection'
import Footer from './landing/Footer'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function LandingPage() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/') {
      const id = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      return () => cancelAnimationFrame(id)
    }
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="pt-16">
        <HeroSection />
        <ValueStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardPreview />
        <BenefitsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
