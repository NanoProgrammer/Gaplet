import React from 'react'

export default function Testimonials() {
  return (
    <section className="mb-32 py-24 px-6 bg-muted">
      <h2 className="text-3xl font-bold text-center mb-16">What professionals say</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Testimonial 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background/80 backdrop-blur-md p-6 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300">
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r" />
          <div className="mb-4">
            <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.17 7C4.6 7 2 9.13 2 12.2c0 2.44 1.78 4.52 4.1 4.86C6.37 16.8 6 15.2 6 14c0-2 1.05-3.6 2.63-4.41C8.34 7.22 7.8 7 7.17 7zm9.66 0c-2.57 0-5.17 2.13-5.17 5.2 0 2.44 1.78 4.52 4.1 4.86C15.97 16.8 15.6 15.2 15.6 14c0-2 1.05-3.6 2.63-4.41-.29-2.37-1.23-2.59-1.4-2.59z" />
            </svg>
          </div>
          <p className="text-base md:text-lg leading-relaxed text-foreground/80 italic mb-6">
            “Gaplet has been a game changer. I used to lose hundreds every time a patient canceled last minute. Now those empty slots fill themselves — sometimes within minutes.”
          </p>
          <div>
            <div className="font-semibold text-foreground">Dr. Sarah Lin</div>
            <div className="text-sm text-muted-foreground">Dental Clinic Owner · Calgary</div>
          </div>
        </div>

        {/* Testimonial 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background/80 backdrop-blur-md p-6 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300">
          <div className="absolute left-0 top-0 h-full w-1 bg-green-500 rounded-r" />
          <div className="mb-4">
            <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.17 7C4.6 7 2 9.13 2 12.2c0 2.44 1.78 4.52 4.1 4.86C6.37 16.8 6 15.2 6 14c0-2 1.05-3.6 2.63-4.41C8.34 7.22 7.8 7 7.17 7zm9.66 0c-2.57 0-5.17 2.13-5.17 5.2 0 2.44 1.78 4.52 4.1 4.86C15.97 16.8 15.6 15.2 15.6 14c0-2 1.05-3.6 2.63-4.41-.29-2.37-1.23-2.59-1.4-2.59z" />
            </svg>
          </div>
          <p className="text-base md:text-lg leading-relaxed text-foreground/80 italic mb-6">
            “I run a small barbershop and every no-show used to hurt. Since switching to Gaplet, I’ve recovered over a dozen appointments I would've lost. It just works.”
          </p>
          <div>
            <div className="font-semibold text-foreground">Marcus Reyes</div>
            <div className="text-sm text-muted-foreground">Barbershop Owner · Edmonton</div>
          </div>
        </div>
      </div>
    </section>
  )
}