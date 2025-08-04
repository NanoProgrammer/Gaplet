import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '$49/mo',
    shadow: 'shadow-lg',
    features: [
      '20 auto-fills per month',
      'Email notifications',
      'Basic dashboard access',
      '2 hour response time',
    ],
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-blue-500',
  },
  {
    name: 'Pro',
    price: '$110/mo',
    shadow: 'shadow-green-400/30 hover:shadow-green-400/50 shadow-lg z-10',
    features: [
      '50 auto-fills per month',
      'SMS + Email notifications',
      'Advanced dashboard access',
      'Priority support',
      '1 to 2 hour response time',
    ],
    highlight: true,
    buttonColor: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-green-500',
  },
  {
    name: 'Premium',
    price: '$180/mo',
    shadow: 'shadow-lg',
    features: [
      '100/mo auto-fills',
      'SMS + Email notifications',
      'Advanced dashboard access',
      'Priority support',
      'Custom branding',
      'under 1 hour response time',
      'Early access to new features',
    ],
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
    textColor: 'text-amber-500',
  },
]

export default function Pricing() {
  return (
    <section className="py-24 px-6 bg-muted/50 mb-32" id='Pricing'>
      <h2 className="text-4xl font-bold text-center mb-6">Simple pricing</h2>
      <p className="text-center text-muted-foreground mb-16">
        Try any plan free for 1 week. Cancel anytime.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background p-8 transition-all duration-300 ${plan.shadow} ${
              plan.highlight ? 'md:py-12 md:px-10 border-2' : ''
            }`}
          >
            <h3 className={`text-2xl font-bold mb-2 ${plan.textColor}`}>{plan.name}</h3>
            <p className="text-xl font-semibold mb-6">{plan.price}</p>
            <ul className="mb-8 space-y-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary text-xl">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <Link
                href="/signup"
              >
                <button
                className={`w-full rounded-xl px-6 py-3 text-white font-medium transition-colors ease-in-out duration-300 ${plan.buttonColor}`}
              >
                Try 1 week free
              </button>
              </Link>
            </div>
        
          </div>
        ))}
      </div>
    </section>
  )
}
