'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function SetUpSection() {
  return (
    <section className="mb-16" id="SetUp">
      {/* Text only (responsive) */}
      <div className="mx-4 md:mx-16">
        <p className="mx-auto max-w-2xl text-slate-700 text-sm sm:text-[15px] md:text-lg leading-relaxed text-center md:text-left">
          Connect your tools and choose who gets alerts. <strong>Gaplets</strong> works with&nbsp;
          <strong>Square</strong> today and we're actively adding <strong>Google Calendar</strong> and&nbsp;
          <strong>Google Sheets</strong>. No new system to learn.
        </p>
      </div>

      {/* Images container - responsive layout */}
      <div className="block md:hidden px-4 mt-8">
        {/* Mobile: vertical stack */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center"
          >
            <Image
              src="/ui/square.avif"
              alt="Square OAuth"
              width={280}
              height={220}
              className="rounded-xl shadow-lg"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center"
          >
            <Image
              src="/ui/dashboard.png"
              alt="Dashboard"
              width={280}
              height={200}
              className="rounded-xl shadow-lg"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex justify-center"
          >
            <Image
              src="/ui/rules.png"
              alt="Dashboard Rules"
              width={260}
              height={160}
              className="rounded-xl shadow-lg"
            />
          </motion.div>
        </div>
      </div>

      {/* Desktop: original animated and rotated images (unchanged) */}
      <div className="hidden md:block relative max-w-2xl w-full h-[400px] left-[25%]">
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -10 }}
          whileInView={{ opacity: 1, y: 0, rotate: -8 }}
          transition={{ duration: 0.4 }}
          className="absolute top-14 left-0 z-30 shadow-xl"
        >
          <Image
            src="/ui/square.avif"
            alt="Square OAuth"
            width={320}
            height={260}
            className="rounded-xl"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 10 }}
          whileInView={{ opacity: 1, y: 0, rotate: 12 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="absolute bottom-50 right-5 z-20"
        >
          <Image
            src="/ui/rules.png"
            alt="Dashboard Rules"
            width={310}
            height={190}
            className="rounded-xl drop-shadow-lg w-56 h-40"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -5 }}
          whileInView={{ opacity: 1, y: 0, rotate: -3 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="absolute top-[49%] right-46 z-40"
        >
          <Image
            src="/ui/dashboard.png"
            alt="Dashboard"
            width={320}
            height={230}
            className="rounded-xl drop-shadow-lg scale-120"
          />
        </motion.div>
      </div>

      {/* Bottom block: text only, no heading */}
      
    </section>
  )
}