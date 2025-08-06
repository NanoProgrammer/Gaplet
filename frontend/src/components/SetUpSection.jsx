'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function SetUpSection() {
  return (
    <section className="mb-32" id='SetUp'>
      <div className="py-24 px-12 mb-16">
        <h2 className="text-4xl font-bold text-center mb-24 max-w-md mx-auto">
          Simple Setup, Seamless Sync
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          <div className="max-w-md text-center md:text-left">
            <h3 className="text-2xl font-semibold mb-4">Connect Your Tools</h3>
            <p>
              Easily connect your Client management system platforms—
              like <strong>Square</strong>. Keep everything in sync, effortlessly.
              We are actively working on integrating with more platforms like Google Calendar, and Google Sheets.
            </p>
          </div>

          {/* Animated and rotated images */}
          <div className="relative max-w-2xl w-full h-[400px]">
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -10 }}
              whileInView={{ opacity: 1, y: 0, rotate: -8 }}
              transition={{ duration: 0.4 }}
              className="absolute top-10 left-0 z-30 shadow-xl"
            >
              <Image
                src="/calendar.avif"
                alt="Google Calendar"
                width={260}
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
                src="/googleSheets.jpg"
                alt="Google Sheets"
                width={210}
                height={190}
                className="rounded-xl drop-shadow-lg w-56 h-40"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -5 }}
              whileInView={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute top-5/11 right-40 z-40"
            >
              <Image
                src="/squareimg.png"
                alt="Square"
                width={290}
                height={260}
                className="rounded-xl drop-shadow-lg scale-120"
              />
            </motion.div>

            <Image
              src="/google-sheets.webp"
              alt="Google Sheets"
              width={64}
              height={64}
              className=" object-cover absolute top-5/8 right-2/13"
            />

            <Image 
              src="/Square.avif"
              alt="Square"
              width={140}
              height={140}
              className="rounded-full object-cover absolute top-3/5 left-1/10"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-100 via-gray-200 to-gray-300 py-16 px-6 md:px-12 flex flex-col md:flex-row items-center justify-evenly gap-12">
  {/* UI Preview Block */}
  <div className="w-full max-w-md md:max-w-[520px] h-64 py-16 px-4 md:h-60 bg-[var(--color-accent)] shadow-md shadow-gray-400 rounded-2xl flex items-center justify-center">
    {/* Replace with actual UI preview or animation */}
    <video
      autoPlay
      loop
      muted
      playsInline
      style={{ width: "100%", height: "auto" }}
      className="w-full h-full object-cover rounded-xl"
    >
      <source src="/gif4.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  </div>

  {/* Text Content Block */}
  <div className="max-w-md text-center md:text-left">
    <h3 className="text-2xl font-semibold mb-4">Customize Your Experience</h3>
    <p>
      Choose how you want to be notified. Select the channel, timing, and contacts to alert 
      when a cancellation occurs — your schedule, your rules.
    </p>
  </div>
</div>

    </section>
  )
}
