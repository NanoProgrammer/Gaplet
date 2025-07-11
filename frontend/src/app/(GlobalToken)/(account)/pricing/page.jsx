'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'

const plans = [
  {
    name: 'starter',
    price: '$19/mo',
    shadow: 'shadow-blue-400/30 hover:shadow-blue-400/50',
    features: [
      '20 auto-fills per month',
      'Email notifications',
      '2 hour response time',
    ],
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-blue-500',
  },
  {
    name: 'pro',
    price: '$49/mo',
    shadow: 'shadow-green-400/30 hover:shadow-green-400/50',
    features: [
      '50 auto-fills per month',
      'SMS + Email notifications',
      'Priority support',
      '1 to 2 hour response time',
    ],
    highlight: true,
    buttonColor: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-green-500',
  },
  {
    name: 'premium',
    price: '$99/mo',
    shadow: 'shadow-amber-400/30 hover:shadow-amber-400/50',
    features: [
      '100 auto-fills per month',
      'SMS + Email notifications',
      'Priority support',
      'Under 1 hour response time',
      'Early access to new features',
    ],
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
    textColor: 'text-amber-500',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (!user?.accessToken) {
      router.push('/signin')
    }
  }, [user, router])

  const goToCheckout = async (plan) => {
    console.log('👉 Plan enviado:', plan);
    
    try {
      const res = await fetch(`http://localhost:4000/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const { url } = await res.json()
      router.push(url)
    } catch (error) {
      console.error(error)
      router.push('/signin')
    }
  }

  return (
    <section
      id="Pricing"
      className="min-h-screen scale-60 py-20 px-4 sm:px-6 md:scale-90 "
    >
      <div className="w-4xl mx-auto text-center bottom-120 relative right-60 md:bottom-20">
        <div className="grid grid-cols-1 sm:mx-0 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col items-center text-center overflow-hidden rounded-2xl border border-border bg-background p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ease-in-out ${plan.shadow} ${
                plan.highlight ? 'md:py-10 md:px-8 border-2' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className={`text-2xl font-bold mb-2 ${plan.textColor}`}>{plan.name}</h3>
              <p className="text-xl font-semibold mb-6">{plan.price}</p>

              <ul className="mb-8 space-y-3 text-left">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary text-xl">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4 w-full">
                <button
                  onClick={() => goToCheckout(plan.name.toLowerCase())}
                  className={`w-full rounded-xl px-6 py-3 text-white font-medium transition-colors ${plan.buttonColor}`}
                >
                  Try 1 week free
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
