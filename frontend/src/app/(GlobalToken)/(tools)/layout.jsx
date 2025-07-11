// app/dashboard/layout.tsx

import Link from 'next/link'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col px-6 py-8 space-y-6">
        <h2 className="text-2xl font-bold">My Dashboard</h2>
        <nav className="flex flex-col space-y-4">
          <Link href="/dashboard" className="hover:text-gray-300">
            Home
          </Link>
          <Link href="/dashboard/profile" className="hover:text-gray-300">
            Profile
          </Link>
          <Link href="/dashboard/settings" className="hover:text-gray-300">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-10 overflow-auto">
        {children}
      </main>
    </div>
  )
}
