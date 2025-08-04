'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function PaymentCancel() {
  const router = useRouter()

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-blue-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-200 p-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <div className="flex flex-col items-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <AlertTriangle className="w-14 h-14 text-red-500" />
          </motion.div>

          <h1 className="text-3xl font-mono font-bold text-red-600">
            Payment Canceled
          </h1>

          <p className="text-gray-700 text-lg leading-relaxed text-center px-4">
            Your payment was not completed. If this was a mistake, you can try again below.
          </p>

          <Button
            onClick={() => router.push('/pricing')}
            className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-base font-semibold"
          >
            Back to Pricing
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
