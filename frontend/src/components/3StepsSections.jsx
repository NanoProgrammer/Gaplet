'use client'
import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function StepsSections() {
  const fadeInDrop = {
    hidden: { opacity: 0, y: -40, rotate: -5 },
    visible: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  }

  return (
    <div className=" scroll-mt-20 container mx-auto px-4 overflow-x-hidden" >
      <h2 className="text-4xl font-bold text-center mb-32 max-w-xl mx-auto">
        Replace Cancelation In 3 Steps
      </h2>

      {/* STEP 1 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInDrop}
        className="bg-gradient-to-b from-purple-100 via-purple-200 to-purple-400 flex flex-col md:flex-row justify-center items-center gap-10 w-full min-h-[28rem] mb-36 px-6 py-12 rounded-xl"
      >
        <div className="relative w-full md:flex-1 max-w-lg rounded-2xl overflow-hidden border-[14px] border-accent shadow-2xl shadow-purple-300">
          <video
      autoPlay
      loop
      muted
      playsInline
      style={{ width: "100%", height: "auto" }}
      className="w-full h-full object-cover rounded-lg"
    >
      <source src="/gif1.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl shadow-purple-300 w-full md:flex-1 max-w-[30rem] p-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            Inform the Cancellation of the Appointment
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Simply delete the appointment from your calendar app.
          </p>
        </div>
      </motion.section>

      {/* STEP 2 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInDrop}
        className="relative bg-gradient-to-b from-orange-200 via-orange-300 to-orange-500/80 flex flex-col md:flex-row justify-center items-center gap-10 w-full min-h-[28rem] mb-36 px-6 py-12 rounded-xl"
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-orange-300 w-full md:flex-1 max-w-[30rem] p-6">
          <h3 className="text-2xl font-bold mb-4">Reach the Right Clients, Instantly</h3>
          <p className="text-md leading-relaxed">
            The moment you cancel an appointment, we take care of the rest.
            Our system identifies which of your clients are eligible based on their preferences
            and your profile settings — and notifies them automatically via email or SMS.
          </p>
          <p className="mt-4 text-sm leading-relaxed">
            No manual work. No back-and-forth. Just seamless, smart communication.
          </p>
        </div>

        <div className="relative bg-white rounded-2xl shadow-2xl shadow-orange-300 w-full md:flex-1 max-w-lg py-2 px-4 h-[17rem] flex items-center justify-center overflow-hidden box-border">
          <video
      autoPlay
      loop
      muted
      playsInline
      className='mb-4 rounded-lg'
      style={{ width: "100%", height: "auto" }}
    >
      <source src="/gif2.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>

          {/* Bubble 1 */}
          
        </div>
      </motion.section>

      {/* STEP 3 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInDrop}
        className="bg-gradient-to-b from-sky-100 via-sky-200 to-sky-400/90 flex flex-col md:flex-row justify-center items-center gap-10 w-full min-h-[28rem] px-6 py-12 mb-36 rounded-xl"
      >
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-400 w-full md:flex-1 max-w-[30rem]">
          <h4 className="text-2xl font-bold text-gray-800 mb-4">First Come, First Served</h4>
          <p className="text-gray-700 text-md leading-relaxed">
            The first client to respond gets the spot — automatically added to your calendar.
            All other eligible clients are instantly notified that the slot is no longer available,
            keeping your schedule clear and up to date without extra effort.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            If they didn’t have a booking yet, they’ll be invited to check other openings.
          </p>
        </div>

        <div className="w-full md:flex-1 max-w-[490px] h-[26rem] border-[9px] border-accent rounded-2xl overflow-hidden shadow-lg shadow-gray-400 box-border">
          <Image
            src="/gif3.png"
            alt="Client Notification"
            width={760}
            height={500}
            className="h-full w-full "
          />
        </div>
      </motion.section>
    </div>
  )
}
