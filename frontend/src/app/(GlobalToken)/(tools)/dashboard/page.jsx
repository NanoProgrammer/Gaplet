'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import {
  RefreshCw,
  Slash,
  TrendingUp,
  CalendarDays,
  Mail,
  Zap,
  Clock,
  MessageSquare,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

 useEffect(() => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken) return;

  fetch(`${API_URL}/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then(async (res) => {
      if (res.status === 401 && refreshToken) {
        // Intenta refrescar el token
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` },
        });

        if (!refreshRes.ok) throw new Error('Refresh failed');

        const newTokens = await refreshRes.json();
        localStorage.setItem('accessToken', newTokens.accessToken);

        // Intenta nuevamente con el nuevo access token
        return fetch(`${API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${newTokens.accessToken}` },
        });
      }

      return res;
    })
    .then((res) => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then((user) => {
  setUserInfo(user); // <- Aquí guardamos el nombre y todo lo demás
  if (user.role === 'USER') {
    router.replace('/pricing');
  }
})
    .catch(() => {
      localStorage.clear();
      router.replace('/signin');
    });
}, []);


  const checklistComplete = userInfo?.connectedIntegration && preferences;

  const replacementLimit = userInfo?.role === 'PREMIUM' ? 100 : userInfo?.role === 'PRO' ? 50 : userInfo?.role === 'STARTER' ? 25 : 0;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back{userInfo?.name ? `, ${userInfo.name.split(' ')[0]} 👋` : ' 👋'}
        </h1>
        <p className="text-gray-500 mt-1">
          Let’s optimize your calendar. Latest recovery:{' '}
          {userInfo?.lastReplacementAt || '—'}
        </p>
      </header>

      {/* Activation Checklist */}
      {userInfo && preferences && !checklistComplete && (
        <section className="mb-12">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">
    Your Activation Checklist
  </h2>
  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 pl-1">
    <li className="flex items-start gap-3">
      {!userInfo.connectedIntegration && (
        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
      )}
      {userInfo.connectedIntegration ? (
        <span className="text-sm text-gray-500 line-through">
          Connect your client management system
        </span>
      ) : (
        <a
          href="/dashboard/integrations"
          className="text-sm text-green-500 font-medium hover:underline transition"
        >
          Connect your client management system
        </a>
      )}
    </li>
    <li className="flex items-start gap-3">
      {!preferences && (
        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
      )}
      {preferences ? (
        <span className="text-sm text-gray-500 line-through">
          Configure notification rules
        </span>
      ) : (
        <a
          href="/dashboard/settings"
          className="text-sm text-green-500 font-medium hover:underline transition"
        >
          Configure notification rules
        </a>
      )}
    </li>
  </ul>
</section>

      )}

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        <StatCard label="Replacements" value={`${userInfo?.totalReplacements || 0}/${replacementLimit}`} icon={<RefreshCw className="w-6 h-6 text-blue-500" />} color="border-l-blue-500" />
        <StatCard label="Cancellations" value={userInfo?.totalCancellations || 0} icon={<Slash className="w-6 h-6 text-red-500" />} color="border-l-red-500" />
        <StatCard label="Recovery Rate" value={`${userInfo?.recoveryRate || 0}%`} icon={<TrendingUp className="w-6 h-6 text-green-500" />} color="border-l-green-500" />
        <StatCard label="Last Recovery" value={userInfo?.lastReplacementAt || '—'} icon={<Clock className="w-6 h-6 text-purple-500" />} color="border-l-purple-500" />
        <StatCard label="SMS Sent" value={userInfo?.smsSent || 0} icon={<MessageSquare className="w-6 h-6 text-pink-500" />} color="border-l-pink-500" />
        <StatCard label="Emails Sent" value={userInfo?.emailSent || 0} icon={<Mail className="w-6 h-6 text-indigo-500" />} color="border-l-indigo-500" />
      </div>

      {/* Activity */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 transition hover:shadow-lg hover:scale-[1.01] duration-200">
          {userInfo?.recentActivity?.length > 0 ? (
            userInfo.recentActivity.map((event, idx) => (
              <ActivityRow key={idx} time={event.time} description={event.description} />
            ))
          ) : (
            <p className="text-gray-500 text-sm">No recent activity yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-white shadow-sm rounded-xl p-5 border-l-4 ${color} transition-transform duration-200 hover:scale-[1.02] hover:shadow-md`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="p-2 rounded-full bg-gray-100">{icon}</div>
      </div>
    </div>
  );
}

function ActivityRow({ time, description }) {
  return (
    <div className="flex justify-between text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        {description}
      </div>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  );
}