'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function PaymentSuccess() {
  const { user, setUser } = useUser()
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return null

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      if (!res.ok) return null

      const data = await res.json()
      if (!data.accessToken) return null

      localStorage.setItem('accessToken', data.accessToken)
      return data.accessToken
    } catch (err) {
      console.error('Error refreshing access token:', err)
      return null
    }
  }

  useEffect(() => {
    const verifySession = async () => {
      let accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      // Si no hay accessToken, intenta refrescarlo
      if (!accessToken && refreshToken) {
        accessToken = await refreshAccessToken()
      }

      if (!accessToken) {
        return router.push('/signin')
      }

      try {
        const res = await fetch(`${API_URL}/user/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          return router.push('/signin')
        }

        const data = await res.json()
        setUser({
          accessToken,
          refreshToken,
          role: data.role,
        })

        router.push('/dashboard')
      } catch (err) {
        console.error('Session validation failed:', err)
        router.push('/signin')
      }
    }

    verifySession()
  }, [setUser, router])

  return <p className="p-8 text-center">Processing your payment…</p>
}
