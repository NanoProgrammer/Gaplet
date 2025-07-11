'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function SignInPage() {
  const { setUser } = useUser()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL
  const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'http://localhost:3000'

  /* ---------- Google ---------- */
  const handleGoogleSignIn = () => {
    const googleAuthURL = `${API_URL}/auth/google`
    const popup = window.open(googleAuthURL, '_blank', 'width=500,height=600')
    if (!popup) return console.error('❌ No se pudo abrir el popup')

    const handleMessage = (event) => {
      if (event.origin !== FRONTEND_ORIGIN) {
        console.warn('❌ Origen no permitido:', event.origin)
        return
      }

      const { accessToken, refreshToken, user, source } = event.data || {}

      // ✅ Evita interferencias como react-devtools
      if (source !== 'gaplets-auth') {
        console.warn('❌ Mensaje no autorizado (source inválido)')
        return
      }

      if (accessToken && refreshToken && user) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        setUser({ accessToken, refreshToken })
        router.push('/dashboard')
      } else {
        console.warn('❌ Datos incompletos en postMessage')
      }

      window.removeEventListener('message', handleMessage)
    }

    window.addEventListener('message', handleMessage, false)
  }

  /* ---------- Email/Password ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const { message } = await res.json()
        return setError(message || 'Sign-in failed')
      }

      const { accessToken, refreshToken } = await res.json()
      if (!accessToken || !refreshToken) {
        return setError('Tokens not returned')
      }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setUser({ accessToken, refreshToken })
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md bg-white/90 border border-gray-200 p-10 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
            <Lock size={24} />
          </div>
          <h1 className="text-3xl font-bold">Sign in to Gaplets</h1>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-800 rounded-md py-2 font-medium hover:bg-gray-50 transition"
        >
          <Image src="/google.avif" alt="Google" width={20} height={20} />
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4 text-sm text-gray-400">
          <div className="h-px bg-gray-300 w-full" />
          or
          <div className="h-px bg-gray-300 w-full" />
        </div>

        {/* Form */}
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
          </div>

          <button className="w-full py-2 bg-primary text-white rounded-md font-semibold">
            Sign In
          </button>

          <p className="text-center text-sm">
            Don’t have an account?{' '}
            <Link href="/signup" className="text-primary underline">
              Create one
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
