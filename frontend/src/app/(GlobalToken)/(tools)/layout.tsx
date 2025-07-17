import { ReactNode } from 'react';
import Sidebar from './_components/sidebar';

export const metadata = {
  title: 'Gaplet Dashboard – Manage Appointments & Calendar Integrations',
  description:
    'Access your Gaplet dashboard to track cancellations, manage client integrations, configure smart notifications, and optimize appointment recovery.',
  keywords: [
    'Gaplet dashboard',
    'appointment recovery',
    'calendar integration',
    'client management',
    'smart notifications',
    'booking optimization',
    'cancellation alerts',
    'appointment scheduling',
    'auto-fill appointments',
    'Gaplet app',
  ],
  robots: {
    index: false,
    follow: true,
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
    </div>
  );
}
