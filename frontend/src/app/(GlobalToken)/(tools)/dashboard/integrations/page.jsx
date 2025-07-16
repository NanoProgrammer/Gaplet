'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  LinkIcon,
  AlertTriangle,
  CalendarClock,
  PlugZap,
  CheckCircle,
} from 'lucide-react';

export default function IntegrationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
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
          localStorage.setItem('refreshToken', newTokens.refreshToken);
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
    if (!data.redirectUrl) {
      throw new Error('Missing redirect URL from backend');
    }

    window.location.href = data.redirectUrl;
  } catch (err) {
    console.error('Connection error:', err);
    alert('There was an error connecting the provider.');
  }
};



  const providers = [
    { name: 'Acuity', key: 'acuity', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    { name: 'Calendly', key: 'calendly', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    { name: 'Square', key: 'square', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 flex items-center gap-3">
          <PlugZap className="w-8 h-8 text-green-500 animate-pulse" /> Integrations
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Connect your booking tools to empower smart, real-time cancellation detection.
        </p>

        <div className="flex items-start gap-4 bg-yellow-100 text-yellow-800 rounded-xl px-6 py-4 border-l-4 border-yellow-500 shadow-sm mb-10">
          <AlertTriangle className="w-5 h-5 mt-1" />
          <div>
            <p className="font-semibold text-sm">
              We cannot create or edit your bookings directly on external platforms.
            </p>
            <p className="text-sm">
              Please monitor all changes from your <strong>Main Dashboard</strong> after using any integration.
            </p>
          </div>
        </div>

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
                        {isConnected ? 'Connected' : 'Click connect to begin'}</p>
                    </div>
                    {isConnected && <CheckCircle className="w-5 h-5 text-green-600 mt-1" />}
                  </div>
                  <Button
                    onClick={() => handleConnect(provider.key)}
                    variant="default"
                    className="w-full flex justify-center gap-2 text-sm"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {isConnected ? 'Reconnect' : 'Connect'} {provider.name}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
