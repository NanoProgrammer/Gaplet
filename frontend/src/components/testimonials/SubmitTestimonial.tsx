"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";

export default function SubmitTestimonial() {
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    // Simulación de envío
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);
    setSubmitted(true);
    // Ocultar agradecimiento después de 2.5s
    const t = setTimeout(() => setSubmitted(false), 2500);
    return () => clearTimeout(t);
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <section aria-labelledby="submit-title" className="relative rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
        <h2 id="submit-title" className="text-base font-semibold text-slate-900">Share your experience</h2>
        <p className="mt-1 text-sm text-slate-700">Tell us how Gaplets helped your team. We read every note.</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-xs font-medium text-slate-700">Name</label>
            <input id="name" name="name" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label htmlFor="role" className="text-xs font-medium text-slate-700">Role</label>
            <input id="role" name="role" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label htmlFor="org" className="text-xs font-medium text-slate-700">Business</label>
            <input id="org" name="org" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label htmlFor="sector" className="text-xs font-medium text-slate-700">Sector</label>
            <select id="sector" name="sector" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500">
              <option>Dentist</option>
              <option>Barber</option>
              <option>Massage</option>
              <option>Clinic</option>
              <option>Mechanic</option>
              <option>Spa</option>
              <option>Chiro</option>
              <option>Aesthetics</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="quote" className="text-xs font-medium text-slate-700">Testimonial</label>
            <textarea id="quote" name="quote" required rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="What changed after using Gaplets?" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60">
              {busy ? "Sending…" : "Submit"}
            </button>
          </div>
        </form>

        {/* Agradecimiento temporal */}
        {submitted && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur"
            aria-live="polite"
          >
            <m.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "tween", duration: 0.25 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
              Thanks for sharing! We’ll review your testimonial.
            </m.div>
          </m.div>
        )}
      </section>
    </LazyMotion>
  );
}
