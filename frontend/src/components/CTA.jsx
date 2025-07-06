
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-12 px-6 relative text-center overflow-hidden">
      

      <div className="relative z-10 max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-4 text-foreground">
          Ready to recover lost income?
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          Start filling last-minute cancellations automatically. Try it free for 7 days.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[var(--primary)] text-white font-semibold px-8 py-3 rounded-lg text-sm hover:brightness-105 hover:shadow-[0_0_8px_var(--ring)] transition-all duration-300"
        >
          Try Free for 7 Days
        </Link>
      </div>
    </section>
  );
}
