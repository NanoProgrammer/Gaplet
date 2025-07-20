// Parte superior del archivo
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

export default function IntegrationsPage() {
  const router = useRouter();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [showManualSteps, setShowManualSteps] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const provider = params.get('provider');

    if (!status || !provider) return;

    if (status === 'success') {
      setNotification({ type: 'success', provider });
    } else if (status === 'error') {
      setNotification({ type: 'error', provider });
    }

    const cleanUrl = window.location.pathname;
    window.history.replaceState(null, '', cleanUrl);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken) {
      router.push('/signin');
      return;
    }

    const fetchUserInfo = async (tokenToUse) => {
      try {
        const res = await fetch(`${apiBase}/user/me`, {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
          setLoading(false);
        } else if (res.status === 401 && refreshToken) {
          const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          });

          if (!refreshRes.ok) {
            router.push('/signin');
            return;
          }

          const newTokens = await refreshRes.json();
          localStorage.setItem('accessToken', newTokens.accessToken);
          await fetchUserInfo(newTokens.accessToken);
        } else {
          throw new Error('Unexpected error');
        }
      } catch (err) {
        console.error(err);
        router.push('/signin');
      }
    };

    fetchUserInfo(accessToken);
  }, []);

  const handleConnect = async (provider) => {
    if (provider === 'google-semi') {
      setShowManualSteps(true);
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/signin');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/auth/connect/${provider}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to get redirect URL:', text);
        alert('There was an error connecting the provider.');
        return;
      }

      const data = await res.json();
      console.log('👉 REDIRECT URL:', data.redirectUrl);
      if (!data.redirectUrl) {
        throw new Error('Missing redirect URL from backend');
      }

      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error('Connection error:', err);
      alert('There was an error connecting the provider.');
    }
  };

  const providers = [{ name: 'Square', key: 'square', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
    { name: 'Acuity', key: 'acuity', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    { name: 'Semi-manual', key: 'google-semi', bg: 'bg-yellow-100/60', text: 'text-yellow-800', border: 'border-yellow-300' },
    
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {notification && (
          <div
            className={`rounded-lg p-4 mb-6 text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {notification.type === 'success'
              ? `✅ ${notification.provider} connected successfully!`
              : `❌ Failed to connect ${notification.provider}.`}
          </div>
        )}

        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 flex items-center gap-3">
  <PlugZap className="w-8 h-8 text-green-500 animate-pulse" /> Integrations
</h1>
<p className="text-gray-600 mb-8 text-lg">
  When you cancel an appointment, Gaplet will detect it and automatically look for a replacement.
  <br />
  Connect your booking tools to enable real-time cancellation detection. 
  <br />
  <span className="text-sm text-gray-500">
    (Cancellations are only considered for up to 3 days of the date of the appointment.)
  </span>
</p>


        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="animate-spin w-4 h-4" /> Loading integrations...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {providers.map((provider) => {
              const isConnected = userInfo?.connectedProviders?.includes(provider.key);
              return (
                <div
                  key={provider.key}
                  className={`rounded-2xl border ${provider.border} ${provider.bg} p-6 shadow transition hover:shadow-lg hover:scale-[1.02] duration-200 relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className={`text-xl font-semibold ${provider.text}`}>{provider.name}</h2>
                      <p className="text-sm text-gray-700">
                        {isConnected ? 'Connected' : 'Click connect to begin'}
                      </p>
                    </div>
                    {isConnected && <CheckCircle className="w-5 h-5 text-green-600 mt-1" />}
                  </div>
                  <Button
                    onClick={() => handleConnect(provider.key)}
                    variant="default"
                    className="w-full flex justify-center gap-2 text-sm"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {isConnected ? 'Reconnect' : 'Connect'} {provider.key === 'google-semi' ? '(manual)' : provider.name}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

       {showManualSteps && (
  <div className="mt-10 p-6 border border-yellow-300/60 bg-yellow-100/60 rounded-2xl shadow-lg space-y-6">
    <div className="flex items-start gap-4">
      <Info className="w-6 h-6 text-yellow-700 mt-1" />
      <div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">
          Manual Integration: Google Calendar + Google Sheets
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Follow these steps to detect cancellations and automatically notify clients using your contact list in Google Sheets.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Step 1 */}
      <div
        className="p-4 bg-white border border-yellow-300/60 rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
        onClick={() => handleConnect('google')}
      >
        <div className="flex items-center gap-3 mb-2">
          <LinkIcon className="w-5 h-5 text-yellow-700" />
          <h4 className="text-sm font-bold text-yellow-800">Step 1: Connect your Google account</h4>
        </div>
        <p className="text-sm text-gray-600">
          Authorize access to your Google Calendar and Sheets so Gaplet can read your bookings and client list.
        </p>
      </div>

      {/* Step 2 */}
      <div
        className="p-4 bg-white border border-yellow-300/60 rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
        onClick={() => alert('Coming soon: paste sheet input')}
      >
        <div className="flex items-center gap-3 mb-2">
          <CalendarClock className="w-5 h-5 text-yellow-700" />
          <h4 className="text-sm font-bold text-yellow-800">Step 2: Add your client list</h4>
        </div>
        <p className="text-sm text-gray-600">
          Paste the link to your Google Sheet. The client list must be in the <strong>first tab</strong>, and the sheet must be publicly accessible or shared with us.
        </p>
      </div>

      {/* Step 3 */}
      <div
        className="p-4 bg-white border border-yellow-300/60 rounded-xl shadow-sm hover:bg-yellow-100/70 transition cursor-pointer"
        onClick={() => alert('Coming soon: confirm sheet structure')}
      >
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-5 h-5 text-yellow-700" />
          <h4 className="text-sm font-bold text-yellow-800">Step 3: Confirm sheet format</h4>
        </div>
        <p className="text-sm text-gray-600">
          Make sure your sheet includes columns like: <em>Name</em>, <em>Email</em>, <em>Service</em>, and <em>Last Visit</em>. These will be used to match and notify clients.
        </p>
      </div>
    </div>

    <div className="pt-4 border-t border-yellow-200/60">
      <p className="text-sm text-gray-700">
        Once connected, Gaplet will automatically scan your calendar for cancellations and notify the right clients using your sheet.
      </p>
    </div>
  </div>
)}
      </div>
    </div>
  );
}