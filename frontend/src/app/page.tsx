
import Header from '../components/Header'
import Hero from '../components/Hero'
import CallSection from '../components/Section2'
import StepsSections from '../components/3StepsSections'
import SetUpSection from '../components/SetUpSection'
import Benefits from '../components/Benefits'
import Testimonials from '../components/Testimonials'
import Pricing from '../components/Pricing'
import Demo from '../components/Demo'
import FAQ from '../components/FAQ'
import CTA from '../components/CTA'
import Footer from '../components/Footer'
import ComingSoon from '../components/ComingSoon'
export default function Home() {
  return (
    <div>
      <Header />
      <Hero />
      <CallSection />
      <StepsSections />
      <SetUpSection />
      <Benefits />
      <Testimonials />
      <Pricing />
      <Demo />
      <FAQ />
      <ComingSoon />
      <CTA />
      <Footer />
    </div>
  );
}
