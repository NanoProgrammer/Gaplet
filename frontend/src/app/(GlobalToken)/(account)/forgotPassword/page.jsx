'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!API_URL) {
        throw new Error('API URL not set in environment variables.');
      }

      const res = await fetch(`${API_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Something went wrong.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md bg-white/90 border border-gray-200 backdrop-blur-xl p-10 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
            <Mail size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Enter your email and we’ll send you instructions to reset it.
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

        {submitted ? (
          <p className="text-center text-green-600 text-sm">
            If your email is registered, you’ll receive a password reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Email address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary text-white rounded-md font-semibold hover:bg-primary/90 transition"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Remembered your password?{' '}
          <Link
            href="/signin"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
