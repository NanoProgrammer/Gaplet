'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const fetchWithAuth = async (url, options = {}) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  let accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  const doFetch = async (token) =>
    fetch(`${apiBase}${url}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let res = await doFetch(accessToken);

  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!refreshRes.ok) throw new Error('Refresh token expired or invalid');

    const { accessToken: newAccessToken } = await refreshRes.json();
    if (!newAccessToken) throw new Error('No new access token provided');

    localStorage.setItem('accessToken', newAccessToken);
    accessToken = newAccessToken;

    res = await doFetch(newAccessToken);
  }

  return res;
};

const unitOptions = [
  { label: 'Minutes', value: 1 },
  { label: 'Hours', value: 60 },
  { label: 'Days', value: 1440 },
  { label: 'Weeks', value: 10080 },
  { label: 'Months', value: 43200 },
];

export default function SettingsPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    matchAppointmentType: true,
    notifyBefore: { value: '', unit: 1440 },
    notifyAfter: { value: '', unit: 1440 },
    maxNotificationsPerGap: '',
  });

  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const access = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');

    if (!access) {
      router.push('/signin');
      return;
    }

    const tryFetchData = async (tokenToUse) => {
      try {
        const prefRes = await fetch(`${apiBase}/auth/preference`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });

        if (prefRes.status === 401 && refresh) {
          const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${refresh}` },
          });

          if (!refreshRes.ok) throw new Error('Refresh token invalid or expired');

          const newTokens = await refreshRes.json();
          if (!newTokens.accessToken) throw new Error('No new access token');

          localStorage.setItem('accessToken', newTokens.accessToken);
          setAccessToken(newTokens.accessToken);

          return await tryFetchData(newTokens.accessToken);
        }

        if (!prefRes.ok) throw new Error('Unauthorized');

        const prefText = await prefRes.text();
        if (prefText) {
          const data = JSON.parse(prefText);
          setForm({
            matchAppointmentType: data.matchAppointmentType,
            notifyBefore: {
              value: data.notifyBeforeMinutes / 1440 || '',
              unit: 1440,
            },
            notifyAfter: {
              value: data.notifyAfterMinutes / 1440 || '',
              unit: 1440,
            },
            maxNotificationsPerGap: data.maxNotificationsPerGap || '',
          });
        }

        const userRes = await fetch(`${apiBase}/user/me`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });

        if (!userRes.ok) throw new Error('Failed to fetch user');

        const userData = await userRes.json();
        setUser(userData);
      } catch (err) {
        console.error('[Auth Fetch Error]', err);
        router.push('/signin');
      }
    };

    setAccessToken(access);
    tryFetchData(access);
  }, []);

  const handleValueChange = (e, field) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], value },
    }));
  };

  const handleUnitChange = (e, field) => {
    const unit = parseInt(e.target.value);
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], unit },
    }));
  };

  const handleSubmit = async () => {
    const notifyBeforeMinutes = Number(form.notifyBefore.value) * form.notifyBefore.unit;
    const notifyAfterMinutes = Number(form.notifyAfter.value) * form.notifyAfter.unit;

    const res = await fetch(`${apiBase}/auth/preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        matchAppointmentType: form.matchAppointmentType,
        notifyBeforeMinutes,
        notifyAfterMinutes,
        maxNotificationsPerGap: form.maxNotificationsPerGap ? Number(form.maxNotificationsPerGap) : null,
      }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/checkout/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data.message || 'Failed to cancel subscription');

      router.push('/');
    } catch (err) {
      console.error('❌ Cancel error:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-20 font-sans text-neutral-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-8 space-y-10"
      >
        <h1 className="text-3xl font-bold text-center">Notification Preferences</h1>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-green-100 text-green-800 text-center py-2 rounded"
          >
            Preferences updated successfully
          </motion.div>
        )}

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between">
  <span className="text-base font-medium">Match appointment type exactly</span>
  <motion.button
    type="button" // 🔧 Previene envío accidental
    onClick={() =>
      setForm((prev) => ({
        ...prev,
        matchAppointmentType: !prev.matchAppointmentType,
      }))
    }
    className="flex items-center w-13 h-8 rounded-full p-1 transition-colors"
    style={{
      backgroundColor: form.matchAppointmentType ? '#155dfc' : '#d1d5db',
      justifyContent: form.matchAppointmentType ? 'flex-end' : 'flex-start',
    }}
    layout
  >
    <motion.div
      className="w-6 h-6 rounded-full shadow"
      style={{ backgroundColor: '#fff' }}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </motion.button>
</label>


            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Notify only if the last appointment was before than:</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    value={form.notifyAfter.value}
                    onChange={(e) => handleValueChange(e, 'notifyAfter')}
                  />
                  <select
                    value={form.notifyAfter.unit}
                    onChange={(e) => handleUnitChange(e, 'notifyAfter')}
                    className="px-2 py-1 border border-gray-300 rounded-md"
                  >
                    {unitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Notify only if the next appointment is later than:</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                    value={form.notifyAfter.value}
                    onChange={(e) => handleValueChange(e, 'notifyAfter')}
                  />
                  <select
                    value={form.notifyBefore.unit}
                    onChange={(e) => handleUnitChange(e, 'notifyBefore')}
                    className="px-2 py-1 border border-gray-300 rounded-md"
                  >
                    {unitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-semibold transition"
            >
              Save Preferences
            </button>
          </div>
        </form>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pt-10 border-t text-sm text-gray-700"
          >
            <p className="mb-1">Email: <span className="font-mono">{user.email}</span></p>
            <p className="mb-4">User ID: <span className="font-mono">{user.id}</span></p>
            <div className="flex gap-4">
              <a href="/pricing">
                <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-100 font-medium">
                  Upgrade Plan
                </button>
              </a>
              <button
                onClick={handleCancel}
                className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
