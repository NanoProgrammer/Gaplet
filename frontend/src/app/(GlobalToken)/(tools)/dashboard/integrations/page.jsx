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

// The Semi-manual integration is fully disabled in this version
// Manual steps section has been commented out

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Loader2, LinkIcon, PlugZap, CheckCircle } from 'lucide-react';

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
    res = await doFetch(newToken);
  }
  return res;
};

// Only Square integration is active; Semi-manual is disabled
const providers = [
  {
    name: 'Square',
    img: '/squarefavicon.webp',
    key: 'square',
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    border: 'border-violet-300',
  },
  {
    name: 'Semi-manual',
    img: '/calendarlogo.webp',
    key: 'google-semi',
    bg: 'bg-white',
    text: 'text-gray-400', // greyed out
    border: 'border-gray-200',
    disabled: true,
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const access = localStorage.getItem('accessToken');
    if (!access) router.push('/signin');
    (async () => {
      try {
        const res = await fetchWithAuth('/user/me');
        if (!res.ok) throw new Error();
        setUserInfo(await res.json());
      } catch {
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleConnect = async (providerKey) => {
    if (providers.find(p => p.key === providerKey)?.disabled) return;
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

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader2 className="animate-spin w-4 h-4" /> Loading integrations...
    </div>
  );

  return (
    <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {notification && (
          <div className={`p-4 border rounded-lg text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-red-100 text-red-800 border-red-300'
          }`}
          >
            {notification.type === 'success'
              ? `✅ ${notification.provider} connected successfully!`
              : `❌ Failed to connect ${notification.provider}.`}
          </div>
        )}

        <h1 className="flex items-center gap-3 text-4xl font-extrabold text-gray-800">
          <PlugZap className="w-8 h-8 text-green-500 animate-pulse" />
          Integrations
        </h1>

        <p className="text-lg text-gray-600">
          When you cancel an appointment, Gaplet will detect it and automatically look for a replacement.
          <br />Connect your booking tools to enable real-time cancellation detection.
          <br /><span className="text-sm text-gray-500">(Up to 3 days before the appointment.)</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {providers.map((prov) => {
            const connected = userInfo.connectedProviders?.includes(prov.key);
            return (
              <div
                key={prov.key}
                className={`p-6 bg-white border rounded-2xl shadow transition ${prov.border} ${prov.bg}`}
              >
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={prov.img}
                      alt={prov.name}
                      width={24}
                      height={24}
                      className={prov.disabled ? 'filter grayscale' : ''}
                    />
                    <div>
                      <h2 className={`text-xl font-semibold ${prov.disabled ? 'text-gray-400' : prov.text}`}>{prov.name}</h2>
                      <p className="text-sm text-gray-500">
                        {prov.disabled
                          ? 'Coming soon...'
                          : connected
                          ? 'Connected'
                          : 'Click connect to begin'}
                      </p>
                    </div>
                  </div>
                  {connected && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>

                <Button
                  onClick={() => handleConnect(prov.key)}
                  disabled={prov.disabled}
                  className={`w-full flex items-center justify-center gap-2 text-sm ${prov.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {connected ? 'Reconnect' : prov.disabled ? 'Coming Soon...' : 'Connect'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
