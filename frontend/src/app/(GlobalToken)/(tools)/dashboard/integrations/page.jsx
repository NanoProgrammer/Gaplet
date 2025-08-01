'use client'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  LinkIcon,
  PlugZap,
  CheckCircle,
  CalendarClock,
  Info,
} from 'lucide-react';

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

    if (!refreshRes.ok) throw new Error('Refresh token invalid');

    const { accessToken: newToken } = await refreshRes.json();
    localStorage.setItem('accessToken', newToken);
    accessToken = newToken;
    res = await doFetch(newToken);
  }

  return res;
};

const providers = [
  { name: 'Square', key: 'square', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { name: 'Acuity', key: 'acuity', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { name: 'Semi-manual', key: 'google-semi', bg: 'bg-yellow-100/60', text: 'text-yellow-800', border: 'border-yellow-300' },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Handle OAuth callback status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const provider = params.get('provider');
    if (status && provider) {
      setNotification({ type: status === 'success' ? 'success' : 'error', provider });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Fetch user info
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const access = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');
    if (!access) return router.push('/signin');
    const load = async (token) => {
      try {
        const res = await fetchWithAuth('/user/me');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUserInfo(data);
      } catch {
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };
    load(access);
  }, []);

  const handleConnect = async (providerKey) => {
    if (providerKey === 'google-semi') {
      return setShowManualSteps(true);
    }
    try {
      const res = await fetchWithAuth(`/auth/connect/${providerKey}`);
      if (!res.ok) throw new Error(await res.text());
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Connection error', err);
      setNotification({ type: 'error', provider: providerKey });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin w-4 h-4" /> Loading integrations...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-5xl mx-auto">
        {notification && (
          <div
            className={`p-4 mb-6 border rounded-lg text-sm font-medium ${
notification.type === 'success'
  ? 'bg-green-100 text-green-800 border-green-300'
  : 'bg-red-100 text-red-800 border-red-300'}
            `}
          >
            {notification.type === 'success'
              ? `✅ ${notification.provider} connected successfully!`
              : `❌ Failed to connect ${notification.provider}.`}
          </div>
        )}

        <h1 className="flex items-center gap-3 mb-4 text-4xl font-extrabold text-gray-800">
          <PlugZap className="w-8 h-8 text-green-500 animate-pulse" /> Integrations
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          When you cancel an appointment, Gaplet will detect it and automatically look for a replacement.<br />
          Connect your booking tools to enable real-time cancellation detection.<br />
          <span className="text-sm text-gray-500">
            (Cancellations are only considered up to 3 days before the appointment.)
          </span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {providers.map((prov) => {
            const connected = userInfo.connectedProviders?.includes(prov.key);
            return (
              <div
                key={prov.key}
                className={`relative p-6 bg-white border rounded-2xl shadow ${
prov.border} ${prov.bg} hover:shadow-lg hover:scale-105 transition`}
              >
                <div className="flex justify-between mb-4">
                  <div>
                    <h2 className={`text-xl font-semibold ${prov.text}`}>{prov.name}</h2>
                    <p className="text-sm text-gray-700">
                      {connected ? 'Connected' : 'Click connect to begin'}
                    </p>
                  </div>
                  {connected && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <Button
                  onClick={() => handleConnect(prov.key)}
                  className="w-full flex items-center justify-center gap-2 text-sm"
                >
                  <LinkIcon className="w-4 h-4" />
                  {connected ? 'Reconnect' : 'Connect'} {prov.name}
                </Button>
              </div>
            );
          })}
        </div>

        {showManualSteps && (
          <div className="mt-10 p-6 space-y-6 bg-yellow-100/60 border border-yellow-300/60 rounded-2xl shadow-lg">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-yellow-700 mt-1" />
              <div>
                <h3 className="mb-2 text-xl font-semibold text-yellow-800">
                  Manual Integration: Google Calendar + Sheets
                </h3>
                <p className="text-sm text-gray-700">
                  Follow these steps to detect cancellations and notify your clients via a Google Sheet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div
                className="p-4 bg-white border rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
                onClick={() => handleConnect('google')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <LinkIcon className="w-5 h-5 text-yellow-700" />
                  <h4 className="text-sm font-bold text-yellow-800">
                    Step 1: Connect Google account
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  Authorize access to Google Calendar & Sheets so Gaplet can read bookings & client lists.
                </p>
              </div>

              <div
                className="p-4 bg-white border rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
                onClick={() => alert('Coming soon: paste sheet link')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <CalendarClock className="w-5 h-5 text-yellow-700" />
                  <h4 className="text-sm font-bold text-yellow-800">
                    Step 2: Add client list
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  Paste your publicly shared sheet link (first tab must have Name, Email, Service, Last Visit columns).
                </p>
              </div>

              <div
                className="p-4 bg-white border rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
                onClick={() => alert('Coming soon: confirm format')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-yellow-700" />
                  <h4 className="text-sm font-bold text-yellow-800">
                    Step 3: Confirm sheet format
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  Ensure columns match the template so Gaplet can match and notify clients.
                </p>
              </div>
            </div>

            <p className="pt-4 text-sm text-gray-700 border-t border-yellow-200/60">
              Once set up, Gaplet will scan for cancellations and notify the right clients automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
