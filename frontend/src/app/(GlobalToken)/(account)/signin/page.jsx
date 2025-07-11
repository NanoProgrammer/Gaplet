'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export default function SignInPage() {
  const { user, setUser } = useUser();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'http://localhost:3000';

  if (!API_URL) {
    throw new Error('❌ NEXT_PUBLIC_API_URL no está definida en tu archivo .env');
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleSignIn = () => {
    const googleAuthURL = `${API_URL}/auth/google`;

    const popup = window.open(googleAuthURL, '_blank', 'width=500,height=600');

    if (!popup) {
      console.error('❌ No se pudo abrir el popup de Google');
      return;
    }

    const handleMessage = (event) => {
      if (event.origin !== FRONTEND_ORIGIN) {
        console.warn('❌ Origen no permitido:', event.origin);
        return;
      }

      const { accessToken, refreshToken, user } = event.data;

      if (accessToken && refreshToken && user) {
        console.log('✅ Google login successful');
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser({ accessToken, refreshToken });
        router.push('/dashboard');
      } else {
        console.warn('❌ Google login falló o datos incompletos');
      }

      window.removeEventListener('message', handleMessage);
    };

    window.addEventListener('message', handleMessage, false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || 'SignIn failed');
        return;
      }

      const data = await res.json();
      if (!data.accessToken || !data.refreshToken) {
        setError('Tokens not returned');
        return;
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      console.log('✅ SignIn success');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Unexpected error');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-transparent px-6 py-20 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md bg-white/90 border border-gray-200 backdrop-blur-xl p-10 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
            <Lock size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">
              Sign in to Gaplets
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Access your dashboard and manage your availability.
            </p>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-800 rounded-md py-2 font-medium hover:bg-gray-50 transition shadow-sm"
          onClick={handleGoogleSignIn}
        >
          <Image
            src="/google.avif"
            alt="Google"
            width={20}
            height={20}
            className="w-5 h-5 bg-transparent"
          />
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center justify-center gap-4 text-sm text-gray-400">
          <div className="h-px bg-gray-300 w-full" />
          <span>or</span>
          <div className="h-px bg-gray-300 w-full" />
        </div>

        {/* Form */}
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Email address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-primary text-white rounded-md font-semibold hover:bg-primary/90 transition"
          >
            Sign In
          </button>

          <p className="text-sm text-center text-gray-600 mt-2">
            Forgot your password?{' '}
            <Link
              href="/forgotPassword"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Recover it here
            </Link>
          </p>

          <p className="text-sm text-center text-gray-600 -mt-2">
            Don’t have an account?{' '}
            <Link
              href="/signup"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Create one
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
