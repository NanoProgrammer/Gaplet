// app/about/page.tsx

export default function AboutPage() {
  return (
    <div className="space-y-20 text-base leading-relaxed text-neutral-700">
      {/* Hero */}
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Behind the Builder</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          One person. One idea. Built with purpose — not hype.
        </p>
      </header>

      {/* Historia del proyecto */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Why Gaplets?</h2>
        <p>
          Gaplets started with a simple frustration: cancelled appointments lead to lost revenue and wasted time.
          Most businesses don’t have the tools to react fast — so I built one. Gaplets fills those gaps automatically,
          letting professionals focus on what matters: their clients.
        </p>
      </section>

      {/* Sobre ti */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Who’s behind this?</h2>
        <p>
          I’m Santiago, a self-taught developer from Alberta with a passion for building tools that actually help people.
          I work solo — from concept to design to deployment. My goal is to create software that feels thoughtful, fast, and personal.
        </p>
      </section>

      {/* Filosofía y stack */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">How It’s Built</h2>
        <p>
          Gaplets is built using <strong>Next.js</strong> for fast, server-rendered performance, styled with <strong>Tailwind CSS v4</strong> and UI components from <strong>shadcn/ui</strong>. It uses modern JavaScript libraries like <strong>Framer Motion</strong> for subtle animations and <strong>React</strong> for a modular, scalable frontend architecture.
        </p>
        <p>
          On the backend, it connects to third-party APIs such as <strong>Google Calendar</strong>, <strong>Jane</strong>, <strong>Square</strong>, and <strong>Twilio</strong> to automate real-time waitlist management and appointment recovery.
        </p>
        <p>
          Every decision — from performance to design to UX — was made intentionally. This project is entirely self-built and deployed via <strong>Netlify</strong>, designed to be both useful and elegant.
        </p>
      </section>

      {/* Contacto */}
      <section className="space-y-6" id="contact">
        <h2 className="text-xl font-semibold">Get in Touch</h2>
        <p>If you’d like to work together or just chat about the project, feel free to reach out:</p>
        <a
  href="https://mail.google.com/mail/?view=cm&fs=1&to=admin@gaplets.com"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-block bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition"
>
  Contact via Gmail
</a>


      </section>
    </div>
  );
}
