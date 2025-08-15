"use client";

import * as React from "react";
import Image from "next/image";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";

export default function StepsSections() {
  const EASE = [0.22, 1, 0.36, 1] as const;
  const fadeInDrop: Variants = {
    hidden: { opacity: 0, y: 20, rotate: -1 },
    show: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { type: "tween", duration: 0.5, ease: EASE },
    },
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="container mx-auto px-4 overflow-x-clip">
        <h2 className="text-3xl font-semibold text-center mb-12">Replace cancellations in 3 steps</h2>

        {/* STEP 1 */}
        <m.section
          variants={fadeInDrop}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3, margin: "-80px" }}
          className="flex flex-col md:flex-row items-center gap-6 w-full rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm mb-10"
          aria-label="Step 1 — Detect the cancellation"
        >
          <div className="relative w-full md:flex-1 max-w-lg overflow-hidden rounded-xl border border-violet-200 bg-white">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="block w-full h-auto"
              aria-label="Calendar deletion detected"
            >
              <source src="/gif1.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="w-full md:flex-1 max-w-xl rounded-xl border border-violet-200 bg-white p-5">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Detect the cancellation</h3>
            <p className="text-slate-700 text-sm">
              Gaplets listens to your provider webhooks. When an appointment is deleted, the opening is detected instantly.
            </p>
          </div>
        </m.section>

        {/* STEP 2 */}
        <m.section
          variants={fadeInDrop}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3, margin: "-80px" }}
          className="flex flex-col md:flex-row items-center gap-6 w-full rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm mb-10"
          aria-label="Step 2 — Notify eligible clients"
        >
          <div className="w-full md:flex-1 max-w-xl rounded-xl border border-violet-200 bg-white p-5 order-2 md:order-1">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Notify the right clients, instantly</h3>
            <p className="text-slate-700 text-sm">
              Email/SMS waves go out to clients who match your rules (same service type, inactive, or no upcoming bookings). No manual work.
            </p>
          </div>
          <div className="relative w-full md:flex-1 max-w-lg overflow-hidden rounded-xl border border-violet-200 bg-white order-1 md:order-2">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="block w-full h-auto"
              aria-label="Clients receive notifications"
            >
              <source src="/gif2.mp4" type="video/mp4" />
            </video>
          </div>
        </m.section>

        {/* STEP 3 */}
        <m.section
          variants={fadeInDrop}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2, margin: "-80px" }}
          className="flex flex-col md:flex-row items-center gap-6 w-full rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm"
          aria-label="Step 3 — Auto‑book the first response"
        >
          <div className="w-full md:flex-1 max-w-xl rounded-xl border border-violet-200 bg-white p-5">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">First come, first served</h3>
            <p className="text-slate-700 text-sm">
              The first client to accept gets the slot automatically. Everyone else is informed that the opening is no longer available. Originals stay intact unless you edit them.
            </p>
          </div>
          <div className="w-full md:flex-1 max-w-lg overflow-hidden rounded-xl border border-violet-200 bg-white">
            <Image
              src="/gif3.png"
              alt="Auto‑booked opening confirmation"
              width={760}
              height={500}
              className="block w-full h-auto"
              priority={false}
            />
          </div>
        </m.section>
      </div>
    </LazyMotion>
  );
}
