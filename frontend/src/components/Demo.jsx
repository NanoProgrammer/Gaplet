

import React from 'react'

export default function Demo() {
  return (
    <section className="relative py-32 px-6 overflow-hidden bg-gradient-to-br from-[#e0f2fe] via-[#fff] to-[#d1fae5]" id='Demo'>
      {/* Decorative blurred blobs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-400 rounded-full blur-[140px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-green-300 rounded-full blur-[140px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-yellow-200 rounded-full blur-[120px] opacity-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6 text-foreground">See Gaplet in action</h2>
        <p className="text-muted-foreground mb-12">
          Here’s how last-minute bookings get filled instantly with our smart notification system.
        </p>

        {/* Video placeholder */}
        <div className="aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-border bg-background">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/demo-preview.jpg" // <- reemplaza con imagen si quieres
          >
            <source src="/demo-placeholder.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  )
}
