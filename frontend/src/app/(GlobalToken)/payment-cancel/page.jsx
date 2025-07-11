'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaymentCancel() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-transparent">
      <div className="max-w-md text-center bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-2xl p-10">
        <h1 className="text-3xl font-bold text-red-400 mb-4 font-mono">Payment Canceled</h1>
        <p className="text-gray-700 mb-6">
          Your payment was not completed. If this was a mistake, you can try again below.
        </p>

        <Button
          onClick={() => router.push('/pricing')}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Go Back to Pricing
        </Button>
      </div>
    </div>
  )
}
