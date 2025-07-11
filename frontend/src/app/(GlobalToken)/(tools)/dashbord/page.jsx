'use client';

import { useUser } from '@/context/UserContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardHome() {
  const { user, setUser } = useUser();
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!user?.accessToken) {
      router.push('/signin');
      return;
    }

    const fetchUserInfo = async () => {
      try {
        const res = await fetch(`${apiBase}/user/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();

          // 👇 Redirigir si es USER
          if (data.role === 'USER') {
            router.push('/pricing');
            return;
          }

          setUserInfo(data);
          return;
        }

        if (res.status === 401) {
          const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.refreshToken}`,
            },
          });

          if (!refreshRes.ok) {
            router.push('/signin');
            return;
          }

          const refreshData = await refreshRes.json();
          if (!refreshData?.accessToken) {
            router.push('/signin');
            return;
          }

          const newUser = {
            ...user,
            accessToken: refreshData.accessToken,
          };
          setUser(newUser);

          const retryRes = await fetch(`${apiBase}/user/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${refreshData.accessToken}`,
            },
          });

          if (!retryRes.ok) {
            router.push('/signin');
            return;
          }

          const retryData = await retryRes.json();

          // 👇 Redirigir si es USER después del refresh
          if (retryData.role === 'USER') {
            router.push('/pricing');
            return;
          }

          setUserInfo(retryData);
          return;
        }

        throw new Error('Unexpected response from /user/me');
      } catch (error) {
        console.error('Error fetching user info:', error);
        router.push('/signin');
      }
    };

    fetchUserInfo();
  }, [user?.accessToken]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800">Welcome to your Dashboard</h1>
      <p className="mt-4 text-gray-600">This is your main dashboard page.</p>

      {userInfo && (
        <div className="mt-6 bg-gray-100 p-4 rounded shadow">
          <h2 className="text-xl font-bold">User Info:</h2>
          <p><strong>Email:</strong> {userInfo.email}</p>
          <p><strong>ID:</strong> {userInfo.id}</p>
          <p><strong>Name:</strong> {userInfo.name}</p>
          <p><strong>Role:</strong> {userInfo.role}</p>
        </div>
      )}
    </div>
  );
}
