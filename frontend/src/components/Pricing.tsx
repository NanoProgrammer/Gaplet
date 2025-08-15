import Link from "next/link";

type Plan = {
  name: string;
  price: number; // monthly USD
  quota: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  href: string;
};

const PLANS: readonly Plan[] = [
  {
    name: "Starter",
    price: 49,
    quota: "20 auto‑fills / mo",
    features: [
      "Email notifications",
      "Basic dashboard",
      "Standard support (~2h)",
    ],
    href: "/signup?plan=starter",
  },
  {
    name: "Pro",
    price: 110,
    quota: "50 auto‑fills / mo",
    features: [
      "SMS + Email notifications",
      "Advanced dashboard",
      "Priority support (1–2h)",
    ],
    highlight: true,
    badge: "Most popular",
    href: "/signup?plan=pro",
  },
  {
    name: "Premium",
    price: 180,
    quota: "100 auto‑fills / mo",
    features: [
      "SMS + Email notifications",
      "Advanced dashboard",
      "Custom branding",
      "Priority support (<1h)",
      "Early feature access",
    ],
    href: "/signup?plan=premium",
  },
] as const;

export default function Pricing() {
  return (
    <section id="Pricing" className="mb-24 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-6 sm:p-8">
      <h2 className="text-center text-2xl font-semibold text-slate-900">Simple pricing</h2>
      <p className="mt-1 text-center text-sm text-slate-600">Try any plan free for 7 days. Cancel anytime.</p>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <article
            key={p.name}
            className={[
              "relative flex h-full flex-col rounded-2xl border p-6 shadow-sm",
              p.highlight ? "border-emerald-300 bg-white/90" : "border-slate-200 bg-white",
            ].join(" ")}
          >
            {p.badge ? (
              <div className="absolute right-3 top-3 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                {p.badge}
              </div>
            ) : null}

            <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">${p.price}</span>
              <span className="text-sm text-slate-600">/mo</span>
            </div>
            <div className="mt-1 text-sm font-medium text-emerald-700">{p.quota}</div>

            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-emerald-600" aria-hidden>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Link
                href={p.href}
                className={[
                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
                  p.highlight
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
                aria-label={`Start free trial on ${p.name}`}
              >
                Start 7‑day free trial
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Included in every plan */}
      <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-700">
        <span className="font-medium">All plans include:</span> Real‑time detection • Eligibility rules • Audit logs
      </div>
    </section>
  );
}
