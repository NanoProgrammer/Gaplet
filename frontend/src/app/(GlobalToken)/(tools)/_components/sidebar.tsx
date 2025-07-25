'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Settings, PlugZap, LogOut } from 'lucide-react';

import { useUser } from '@/context/UserContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { setUser } = useUser(); 
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> },
    { name: 'Integrations', href: '/dashboard/integrations', icon: <PlugZap /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/signin');
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r bg-white px-6 py-8 shadow-sm">
      <div className="space-y-10">
        <div className="text-2xl font-extrabold tracking-tight">Gaplet</div>
        <nav className="space-y-2 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-600 font-semibold'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="w-5 h-5">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
