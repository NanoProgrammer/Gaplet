'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Slash,
  TrendingUp,
  CalendarDays,
  Mail,
  Clock,
  MessageSquare,
} from 'lucide-react';

function toCapitalize(str) {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.accessToken) return null;

      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      let accessToken = localStorage.getItem('accessToken');

      if (!accessToken && refreshToken) {
        accessToken = await refreshAccessToken();
      }

      if (!accessToken) {
        return router.replace('/signin');
      }

      try {
        const res = await fetch(`${API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ /user/me responded with', res.status, errorText);
          throw new Error('Failed to fetch user');
        }

        const user = await res.json();
        setUserInfo(user);

        if (user.role === 'USER') {
          return router.replace('/pricing');
        }

        const prefsRes = await fetch(`${API_URL}/auth/preference`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let prefs = null;
        if (prefsRes.ok) {
          const text = await prefsRes.text();
          prefs = text ? JSON.parse(text) : null;
        }

        setPreferences(prefs);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        localStorage.clear();
        router.replace('/signin');
      }
    };

    const timer = setTimeout(fetchData, 50);
    return () => clearTimeout(timer);
  }, []);

  const replacementLimit =
    userInfo?.role === 'PREMIUM'
      ? 100
      : userInfo?.role === 'PRO'
      ? 50
      : userInfo?.role === 'STARTER'
      ? 20
      : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const recentActivity = [];

  if (userInfo?.lastCancellationAt) {
    recentActivity.push({
      time: formatDate(userInfo.lastCancellationAt),
      description: 'Last cancellation detected',
    });
  }

  if (userInfo?.lastReplacementAt) {
    recentActivity.push({
      time: formatDate(userInfo.lastReplacementAt),
      description: 'Last replacement successfully filled',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back{userInfo?.name ? `, ${userInfo.name.split(' ')[0]} 👋` : ' 👋'}
        </h1>
        <p className="text-gray-500 mt-1">
          Let’s optimize your calendar. Latest recovery:{' '}
          {userInfo?.lastReplacementAt ? formatDate(userInfo.lastReplacementAt) : '—'}
        </p>
      </header>

      {userInfo && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Activation Checklist
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 pl-1">
  <li className="flex items-start gap-3">
    {/* Punto verde sólo si hay integración y no ha expirado */}
    {userInfo.connectedIntegration &&
      userInfo.connectedIntegration.expiresAt < Date.now() && (
        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
    )}
    {/* Texto tachado si está conectado y válido, si no, link */}
    {userInfo.connectedIntegration &&
    userInfo.connectedIntegration.expiresAt < Date.now() ? (
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
    {/* Punto verde sólo si las preferencias ya están configuradas */}
    {preferences && (
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

      {userInfo?.role && (
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Your Role: <strong className="text-blue-600">{toCapitalize(userInfo.role)}</strong>
        </h3>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        <StatCard label="Replacements" value={`${userInfo?.totalReplacements || 0}/${replacementLimit}`} icon={<RefreshCw className="w-6 h-6 text-blue-500" />} color="border-l-blue-500" />
        <StatCard label="Cancellations" value={userInfo?.totalCancellations || 0} icon={<Slash className="w-6 h-6 text-red-500" />} color="border-l-red-500" />
        <StatCard label="Recovery Rate" value={`${((userInfo?.totalReplacements/(userInfo?.totalCancellations || 1)).toFixed(2)) * 100 || 0}%`} icon={<TrendingUp className="w-6 h-6 text-green-500" />} color="border-l-green-500" />
        <StatCard label="Last Recovery" value={userInfo?.lastReplacementAt ? formatDate(userInfo.lastReplacementAt) : '—'} icon={<Clock className="w-6 h-6 text-purple-500" />} color="border-l-purple-500" />
        <StatCard label="SMS Sent" value={userInfo?.smsSent || 0} icon={<MessageSquare className="w-6 h-6 text-pink-500" />} color="border-l-pink-500" />
        <StatCard label="Emails Sent" value={userInfo?.emailSent || 0} icon={<Mail className="w-6 h-6 text-indigo-500" />} color="border-l-indigo-500" />
      </div>

      <section className="mt-12">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">
    Recent Activity
  </h2>
  <div
    className="bg-white rounded-xl shadow-sm p-6 space-y-4
               transition hover:shadow-lg hover:scale-[1.01] duration-200"
  >
    {(() => {
      // 1. Mapea cancelaciones desde OpenSlot (cancelationLogs)
      const cancels = (userInfo?.cancelationLogs || []).map(log => ({
        id: log.id,
        date: new Date(log.startAt),                        // momento de la cancelación
        description: `Cancellation on ${new Date(
          log.startAt
        ).toLocaleString()}`,                                // sin datos sensibles
      }));

      // 2. Mapea reemplazos (ReplacementLogs)
      const replaces = (userInfo?.ReplacementLogs || []).map(log => ({
        id: log.id,
        date: new Date(log.respondedAt),                     // cuando respondió el cliente
        description: `${log.clientName || log.clientEmail} (${log.clientEmail}) responded on ${new Date(
          log.respondedAt
        ).toLocaleString()}`,                                // sólo nombre/email y fecha
      }));

      // 3. Une ambos, ordena por fecha descendente, y limita a 10
      const recent = [...cancels, ...replaces]
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);

      // 4. Renderiza o mensaje si no hay nada
      return recent.length > 0 ? (
        recent.map(evt => (
          <ActivityRow
            key={evt.id}
            time={evt.date.toLocaleString()}
            description={evt.description}
          />
        ))
      ) : (
        <p className="text-gray-500 text-sm">No recent activity yet.</p>
      );
    })()}
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
