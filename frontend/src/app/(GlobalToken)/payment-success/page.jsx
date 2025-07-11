// app/payment-success/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function PaymentSuccess() {
  const { user, setUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    // vuelve a pedir /user/me con el token actual
    const refresh = async () => {
      if (!user?.accessToken) return router.push('/signin')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
      if (!res.ok) return router.push('/signin')

      const data = await res.json()
      setUser({ ...user, role: data.role })   // ⚡ actualiza rol en contexto
      router.push('/dashboard')               // o la ruta que corresponda
    }

    refresh()
  }, [])

  return <p className="p-8 text-center">Processing your payment…</p>
}
