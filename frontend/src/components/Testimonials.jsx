"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Testimonials() {
  const card =
    "relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50/40 to-white p-6 shadow-[0_2px_10px_rgba(2,6,23,0.05)]";

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            Social proof
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            What professionals say
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            Clinics, salons, and shops use Gaplets to keep their calendars full.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1 */}
          <motion.figure
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4 }}
            className={card}
          >
            <div className="mb-4 flex items-center gap-2 text-emerald-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7.17 7C4.6 7 2 9.13 2 12.2c0 2.44 1.78 4.52 4.1 4.86C6.37 16.8 6 15.2 6 14c0-2 1.05-3.6 2.63-4.41C8.34 7.22 7.8 7 7.17 7zm9.66 0c-2.57 0-5.17 2.13-5.17 5.2 0 2.44 1.78 4.52 4.1 4.86C15.97 16.8 15.6 15.2 15.6 14c0-2 1.05-3.6 2.63-4.41-.29-2.37-1.23-2.59-1.4-2.59z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide">
                Dental
              </span>
            </div>
            <blockquote className="text-base md:text-lg leading-relaxed text-slate-800/90 italic">
              “Gaplets was a game-changer. We used to lose hundreds whenever a
              patient canceled last minute. Now those empty slots fill
              themselves — often within minutes.”
            </blockquote>
            <figcaption className="mt-6">
              <div className="font-semibold text-slate-900">Dr. Sarah Lin</div>
              <div className="text-sm text-slate-500">Dental Clinic Owner · Calgary</div>
            </figcaption>

            {/* soft edge glow */}
            <span className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-emerald-300/0 to-sky-300/0 opacity-0 blur-xl transition-opacity duration-300 hover:opacity-40" />
          </motion.figure>

          {/* Card 2 */}
          <motion.figure
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className={card}
          >
            <div className="mb-4 flex items-center gap-2 text-emerald-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7.17 7C4.6 7 2 9.13 2 12.2c0 2.44 1.78 4.52 4.1 4.86C6.37 16.8 6 15.2 6 14c0-2 1.05-3.6 2.63-4.41C8.34 7.22 7.8 7 7.17 7zm9.66 0c-2.57 0-5.17 2.13-5.17 5.2 0 2.44 1.78 4.52 4.1 4.86C15.97 16.8 15.6 15.2 15.6 14c0-2 1.05-3.6 2.63-4.41-.29-2.37-1.23-2.59-1.4-2.59z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide">
                Barber/Salon
              </span>
            </div>
            <blockquote className="text-base md:text-lg leading-relaxed text-slate-800/90 italic">
              “I run a small barbershop and every no-show hurt. Since switching
              to Gaplets, we’ve recovered more than a dozen appointments I would
              have lost. It just works.”
            </blockquote>
            <figcaption className="mt-6">
              <div className="font-semibold text-slate-900">Marcus Reyes</div>
              <div className="text-sm text-slate-500">Barbershop Owner · Edmonton</div>
            </figcaption>

            <span className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-emerald-300/0 to-sky-300/0 opacity-0 blur-xl transition-opacity duration-300 hover:opacity-40" />
          </motion.figure>
        </div>

        {/* CTA to all testimonials */}
        <div className="mt-10 text-center">
          <Link
            href="/testimonials"
            className="relative inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(0,0,0,0)] transition hover:shadow-[0_0_32px_rgba(16,185,129,0.45)] focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Check all testimonials
          </Link>
        </div>
      </div>
    </section>
  );
}
