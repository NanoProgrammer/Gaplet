/*
VERSION ACTIVA GOOGLE
'use client'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image'
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
  { name: 'Square', img:"/squarefavicon.webp", imgsize:" h-7 w-8", key: 'square', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { name: 'Semi-manual', img:"/calendarlogo.webp", imgsize:" h-9 w-9", key: 'google-semi', bg: 'bg-white', text: 'text-blue-800', border: 'border-blue-300' },
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
prov.border} ${prov.bg} hover:shadow-lg hover:scale-[102%] transition`}
              >
                <div className="flex justify-between mb-4">
                  <div className='flex flex-row items-center gap-3'>
                    <Image src={prov.img} alt={prov.name} width={24} height={18} className={prov.imgsize} />
                    <div>
                      <h2 className={`text-xl font-semibold ${prov.text}`}>{prov.name}</h2>
                    <p className="text-sm text-gray-700">
                      {connected ? 'Connected' : 'Click connect to begin'}
                    </p>
                    </div>
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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="mt-10 p-8 space-y-8 bg-white border border-blue-100 rounded-3xl shadow-lg"
  >
    <div className="flex items-start gap-4">
      <Info className="w-6 h-6 text-blue-600 mt-1" />
      <div>
        <h3 className="mb-2 text-2xl font-semibold text-blue-700">
          Manual Integration: Google Calendar &amp; Sheets
        </h3>
        <p className="text-sm text-gray-600">
          Follow these steps to detect cancellations and notify your clients via a Google Sheet.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        {
          icon: <LinkIcon className="w-5 h-5 text-blue-600" />,
          title: 'Step 1: Connect Google account',
          text: 'Authorize Gaplet to access your Google Calendar and Sheets.',
          onClick: () => handleConnect('google'),
        },
        {
          icon: <CalendarClock className="w-5 h-5 text-blue-600" />,
          title: 'Step 2: Paste sheet link',
          text: 'Paste your publicly shared Google Sheet link (first tab: Name, Email, Service, Last Visit).',
          onClick: () => alert('Coming soon: paste sheet link'),
        },
        {
          icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
          title: 'Step 3: Confirm sheet format',
          text: 'Ensure your sheet matches the template so Gaplet can correctly match and notify clients.',
          onClick: () => alert('Coming soon: confirm format'),
        },
      ].map((step, idx) => (
        <motion.div
          key={idx}
          onClick={step.onClick}
          whileHover={{ scale: 1.02, borderColor: '#60A5FA' }}
          className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            {step.icon}
            <h4 className="text-base font-semibold text-blue-700">
              {step.title}
            </h4>
          </div>
          <p className="text-sm text-gray-600">{step.text}</p>
        </motion.div>
      ))}
    </div>

    <p className="pt-6 text-sm text-gray-600 border-t border-blue-100">
      Once set up, Gaplet will automatically scan for cancellations and notify eligible clients.
    </p>
  </motion.div>
)}
      </div>
    </div>
  );
}
  */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import IntegrationsDirectory from '@/components/integrations/IntegrationsDirectory';
import ConnectorsPanel from '@/components/integrations/ConnectorsPanel';
import { Loader2, LinkIcon, PlugZap, CheckCircle, X } from 'lucide-react';

const fetchWithAuth = async (url, options = {}) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  const doFetch = (token) =>
    fetch(`${apiBase}${url}`, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
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
    res = await doFetch(newToken);
  }
  return res;
};

// Providers that can be connected today. Everything else lives in the directory below.
const providers = [
  {
    name: 'Square Appointments',
    img: '/squarefavicon.webp',
    key: 'square',
    desc: 'Real-time cancellation detection via webhooks.',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const provider = params.get('provider');
    if (status && provider) {
      setNotification({ type: status === 'success' ? 'success' : 'error', provider });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.replace('/signin');
      return;
    }
    (async () => {
      try {
        const res = await fetchWithAuth('/user/me');
        if (!res.ok) throw new Error();
        setUserInfo(await res.json());
      } catch {
        router.replace('/signin');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleConnect = async (providerKey) => {
    setConnecting(providerKey);
    try {
      const res = await fetchWithAuth(`/auth/connect/${providerKey}`);
      if (!res.ok) throw new Error(await res.text());
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Connection error', err);
      setNotification({ type: 'error', provider: providerKey });
      setConnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-10 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading integrations...
      </div>
    );
  }

  const connectedCount = providers.filter((p) => userInfo?.connectedProviders?.includes(p.key)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {notification && (
          <div
            role="status"
            className={`flex items-center justify-between rounded-lg border p-4 text-sm font-medium ${
              notification.type === 'success'
                ? 'border-green-300 bg-green-100 text-green-800'
                : 'border-red-300 bg-red-100 text-red-800'
            }`}
          >
            <span>
              {notification.type === 'success'
                ? `✅ ${notification.provider} connected successfully!`
                : `❌ Failed to connect ${notification.provider}.`}
            </span>
            <button onClick={() => setNotification(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-black/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <header className="space-y-3">
          <h1 className="flex items-center gap-3 text-4xl font-extrabold text-gray-800">
            <PlugZap className="h-8 w-8 text-green-500" /> Integrations
          </h1>
          <p className="max-w-3xl text-lg text-gray-600">
            When you cancel an appointment, Gaplet detects it and looks for a replacement. Connect your booking tool to enable
            real-time cancellation detection{' '}
            <span className="text-sm text-gray-500">(up to 3 days before the appointment).</span>
          </p>
        </header>

        <section aria-labelledby="connected-title" className="space-y-4">
          <h2 id="connected-title" className="text-lg font-semibold text-gray-800">
            Available to connect <span className="text-sm font-normal text-gray-500">· {connectedCount} connected</span>
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((prov) => {
              const connected = userInfo?.connectedProviders?.includes(prov.key);
              return (
                <div key={prov.key} className="rounded-2xl border border-violet-300 bg-violet-50 p-6 shadow transition hover:shadow-lg">
                  <div className="mb-4 flex justify-between">
                    <div className="flex items-center gap-3">
                      <Image src={prov.img} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                      <div>
                        <h3 className="text-lg font-semibold text-violet-800">{prov.name}</h3>
                        <p className="text-sm text-gray-600">{connected ? 'Connected' : prov.desc}</p>
                      </div>
                    </div>
                    {connected && <CheckCircle className="h-5 w-5 text-green-600" aria-label="Connected" />}
                  </div>
                  <Button
                    onClick={() => handleConnect(prov.key)}
                    disabled={connecting === prov.key}
                    className="flex w-full items-center justify-center gap-2 text-sm"
                  >
                    {connecting === prov.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                    {connected ? 'Reconnect' : 'Connect'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        <ConnectorsPanel onConnectGoogle={() => handleConnect('google')} />

        <section aria-labelledby="directory-title" className="space-y-4">
          <div>
            <h2 id="directory-title" className="text-lg font-semibold text-gray-800">
              More software by industry
            </h2>
            <p className="text-sm text-gray-500">Tell us which one you use — requests decide what we build next.</p>
          </div>
          <IntegrationsDirectory mode="dashboard" />
        </section>
      </div>
    </div>
  );
}
