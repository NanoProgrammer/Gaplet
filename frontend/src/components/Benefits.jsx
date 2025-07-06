'use client'

import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Zap,
  CheckCircle,
  Globe,
  Bell,
  Clock,
} from 'lucide-react'


const benefits = [
  {
    title: 'Turn No-Shows into Revenue',
    description: 'Fill last-minute cancellations instantly — keep your calendar (and revenue) full.',
    icon: <DollarSign className="text-green-500 w-8 h-8" />,
  },
  {
    title: 'Fully Automated',
    description: 'Detects cancellations and fills them automatically. No manual work needed.',
    icon: <Zap className="text-blue-500 w-8 h-8" />,
  },
  {
    title: 'No App to Install',
    description: 'Runs in your browser. Desktop, tablet or mobile — no downloads required.',
    icon: <Globe className="text-indigo-500 w-8 h-8" />,
  },
  {
    title: 'Smart Targeting',
    description: 'Only clients with future bookings are notified — no spam.',
    icon: <CheckCircle className="text-teal-500 w-8 h-8" />,
  },
  {
    title: 'First Come, First Booked',
    description: 'Everyone is notified at once. The first to confirm takes the spot.',
    icon: <Clock className="text-orange-500 w-8 h-8" />,
  },
  {
    title: 'Custom Notifications',
    description: 'Send alerts via SMS, email, or both. You’re in control.',
    icon: <Bell className="text-purple-500 w-8 h-8" />,
  },
]

export default function BenefitsLoopSlider() {
  const containerRef = useRef(null)

  return (
    <section className="py-24  bg-white text-black overflow-hidden">
      <h2 className="text-4xl font-bold text-center mb-12">
        Why Businesses Love Gaplet
      </h2>

      <div className="overflow-hidden">
        <motion.div
          ref={containerRef}
          className="flex gap-6 w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            repeat: Infinity,
            ease: 'linear',
            duration: 36,
          }}
        >
          {[...benefits, ...benefits].map((benefit, index) => (
            <div
              key={index}
              className="min-w-[280px] md:min-w-[360px] max-w-[360px] p-6 bg-gray-100 text-gray-800 rounded-2xl shadow-md flex-shrink-0"
            >
              <div className="mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-700">{benefit.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
