// FILE: src/app/(app)/billing/pricing-client.tsx (example location)
// If you keep it as a page, you can rename to: src/app/(app)/billing/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

// ────────────────────────────────────────────────────────────────────────────────
// Types & data
// ────────────────────────────────────────────────────────────────────────────────
type PlanKey = "starter" | "pro" | "premium";

type Plan = {
  key: PlanKey;
  name: string;
  price: number; // monthly USD
  quota: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

const PLANS: readonly Plan[] = [
  {
    key: "starter",
    name: "Starter",
    price: 49,
    quota: "20 auto‑fills / mo",
    features: ["Email notifications", "Standard support (~2h)"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 110,
    quota: "50 auto‑fills / mo",
    features: ["SMS + Email notifications", "Priority support (1–2h)"],
    highlight: true,
    badge: "Most popular",
  },
  {
    key: "premium",
    name: "Premium",
    price: 180,
    quota: "100 auto‑fills / mo",
    features: [
      "SMS + Email notifications",
      "Custom branding",
      "Priority support (<1h)",
      "Early feature access",
    ],
  },
] as const;

// Map legacy role coming from API to a plan key (fallback only)
function roleToPlanKey(role: string | null | undefined): PlanKey | null {
  if (!role) return null;
  const r = String(role).toUpperCase();
  if (r.includes("STARTER")) return "starter";
  if (r.includes("PRO")) return "pro";
  if (r.includes("PREMIUM")) return "premium";
  return null;
}

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────
export default function PricingClient() {
  const router = useRouter();
  const { setUser } = useUser();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [userPlan, setUserPlan] = React.useState<PlanKey | null>(null);
  const [loadingPlan, setLoadingPlan] = React.useState<PlanKey | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Guard + load current subscription/role
  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      router.push("/signin");
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();

        setAccessToken(token);
        // Prefer subscription.plan; fallback to role mapping
        const planKey: PlanKey | null = (data?.subscription?.plan as PlanKey) || roleToPlanKey(data?.role);
        if (planKey) setUserPlan(planKey);
      } catch (err) {
        console.error("Error fetching user:", err);
        router.push("/signin");
      }
    }

    fetchUser();
  }, [API_URL, router]);

  async function goToCheckout(plan: PlanKey) {
    if (!accessToken) return router.push("/signin");
    setErrorMsg(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch(`${API_URL}/checkout/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { url } = (await res.json()) as { url: string };
      router.push(url);
    } catch (error) {
      console.error(error);
      setErrorMsg("Could not start checkout. Please sign in again.");
      router.push("/signin");
    } finally {
      setLoadingPlan(null);
    }
  }

  function handleLogout() {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/signin");
  }

  return (
    <section id="Pricing" className="mx-auto mb-24 max-w-6xl rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-6 sm:p-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Choose a plan</h1>
        <p className="mt-1 text-sm text-slate-600">7‑day free trial on any plan. Cancel anytime.</p>
      </header>

      <div className="mx-auto mt-8 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = userPlan === p.key;
          const isLoading = loadingPlan === p.key;
          return (
            <article
              key={p.key}
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

              <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">${p.price}</span>
                <span className="text-sm text-slate-600">/mo</span>
              </div>
              <div className="mt-1 text-sm font-medium text-emerald-700">{p.quota}</div>

              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <button
                  onClick={() => goToCheckout(p.key)}
                  disabled={isCurrent || isLoading}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
                    isCurrent
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                      : p.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                  aria-label={isCurrent ? `${p.name} is your current plan` : `Choose ${p.name}`}
                >
                  {isCurrent ? "Current plan" : isLoading ? "Redirecting…" : "Start 7‑day free trial"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {errorMsg ? (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}

      {/* Account actions */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <span>Need help with billing? </span>
        <Link href="/docs/faq#billing" className="underline underline-offset-4">
          Read the Billing FAQ
        </Link>
        {userPlan ? (
          <>
            <span> · </span>
            <button onClick={handleLogout} className="underline underline-offset-4">
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
