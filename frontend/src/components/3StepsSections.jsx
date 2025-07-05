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
    <div className='mt-32'>
      <h2 className='text-4xl font-bold text-center mb-16 max-w-md mx-auto'>Replace Cancelation In 3 Steps</h2>

      {/* Step 1 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInDrop}
        className="bg-gradient-to-b from-purple-100 via-purple-200 to-purple-400 filter flex flex-col md:flex-row justify-evenly items-center w-full min-h-[28rem] mb-36 px-6 py-10"
      >
        <div className="relative w-full md:w-[40%] mt-10 md:mt-20 rounded-2xl overflow-hidden border-[12px] border-accent shadow-2xl shadow-purple-300">
          <Image
            src="/gitimg1.avif"
            alt="Gift"
            width={500}
            height={500}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-white rounded-2xl shadow-2xl shadow-purple-300 w-full md:w-1/3 p-6 md:mt-20">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            Inform the Cancellation of the Appointment
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Simply delete the appointment from your calendar app — it’s that easy.
          </p>
        </div>
      </motion.section>
     
      {/* Step 2 */}
<motion.section
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.3 }}
  variants={fadeInDrop}
  className="relative bg-gradient-to-b from-orange-200 via-orange-300 to-orange-500/80 filter flex flex-col md:flex-row justify-evenly items-center w-full min-h-[32rem] mb-36 px-6 py-10"
>
  {/* Left Text Card */}
  <div className="bg-white rounded-2xl shadow-2xl shadow-orange-300 w-full md:w-1/3 p-6 md:mt-20">
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

  {/* Right Visual Card with Floating Bubbles */}
  <div className="relative bg-white rounded-2xl shadow-2xl shadow-orange-300 w-full md:w-1/3 p-6 md:mt-20 h-[21rem] flex items-center justify-center overflow-hidden">
    <Image
      src="/emailimg.avif"
      alt="email"
      width={500}
      height={500}
      className="w-full h-full object-cover rounded-xl"
    />

    {/* Bubble 1 */}


  </div>
  <motion.div
      initial={{ opacity: 0, x: -40, y: -40, rotate: 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0, rotate: -15 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="absolute top-30 left-[560px] bg-gray-100 px-4 py-2 rounded-xl shadow-md text-sm text-gray-800 rotate-[-5deg] border"
    >
      New appointment available!
    </motion.div>

    {/* Bubble 2 */}
    <motion.div
      initial={{ opacity: 0, x: 40, y: 40, rotate: 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0, rotate: 15 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="absolute top-30 right-16  bg-gray-100 px-4 py-2 rounded-xl shadow-md text-sm text-gray-800 rotate-[5deg] border"
    >
      Want to take this slot?
    </motion.div>
</motion.section>


      {/* Step 3 */}
      <motion.section
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.2 }}
  variants={fadeInDrop}
  className="bg-gradient-to-b from-sky-100 via-sky-200 to-sky-400/90 filter flex flex-col md:flex-row justify-evenly items-center w-full min-h-[30rem] px-6 py-16 gap-10 mb-36"
>
  {/* Text Box */}
  <div className="bg-white rounded-2xl p-8 shadow-xl shadow-gray-400 w-full md:w-1/3 relative">
    <h4 className="text-2xl font-bold text-gray-800 mb-4">
      First Come, First Served
    </h4>
    <p className="text-gray-700 text-md leading-relaxed">
      The first client to respond gets the spot—automatically added to your calendar.
      All other eligible clients are instantly notified that the slot is no longer available,
      keeping your schedule clear and up to date without extra effort.
    </p>
    <p className="mt-4 text-sm text-gray-500">
      If they didn’t have a booking yet, they’ll be invited to check other openings.
    </p>
  </div>

  {/* Image Box */}
  <div className="w-full md:w-[40%] h-[24rem] bg-accent border-[12px] border-accent rounded-2xl overflow-hidden shadow-xl shadow-gray-400 relative">
    <Image
      src="/gitimg1.avif"
      alt="Client Notification"
      width={500}
      height={500}
      className="h-full w-full object-cover"
    />
  </div>
</motion.section>

    </div>
  )
}
