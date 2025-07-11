'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function PaymentSuccess() {
  const { user, setUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    const refresh = async () => {
      const accessToken = user?.accessToken || localStorage.getItem('accessToken')

      if (!accessToken) return router.push('/signin')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) return router.push('/signin')

      const data = await res.json()

      // ✅ Guarda en contexto por si no estaba aún
      setUser({
        accessToken,
        refreshToken: localStorage.getItem('refreshToken'),
        role: data.role,
      })

      router.push('/dashboard')
    }

    refresh()
  }, [setUser, router, user])

  return <p className="p-8 text-center">Processing your payment…</p>
}
