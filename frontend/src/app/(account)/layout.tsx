// src/app/(auth)/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Gaplets | Sign in or Create Account',
  description:
    'Login or create your Gaplets account to automate your scheduling and fill last-minute gaps effortlessly.',
  openGraph: {
    title: 'Gaplets | Access Your Account',
    description:
      'Sign in or create an account to use Gaplets — the smart platform that fills your last-minute appointment gaps automatically.',
    url: 'https://gaplets.com/sign-in',
    siteName: 'Gaplets',
    type: 'website',
    images: [
      {
        url: '/og_gaplet.png',
        width: 1200,
        height: 630,
        alt: 'Gaplets login OG image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaplets | Login or Create Account',
    description: 'Sign in to Gaplets and manage your smart appointment automation.',
    images: ['/og_gaplet.png'],
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef5ff] via-[#fdfbff] to-[#f3f7f9] px-6 py-20 overflow-hidden isolate">
      {/* Background static blobs */}
      <div className="absolute w-[500px] h-[500px] bg-[#99ccff] rounded-full blur-[70px] opacity-80 -top-40 -left-40" />
      <div className="absolute w-[400px] h-[400px] bg-[#e6ccff] rounded-full blur-[80px] opacity-80 top-1/3 right-[-150px]" />
      <div className="absolute w-[350px] h-[350px] bg-[#c0ffe0] rounded-full blur-[90px] opacity-80 bottom-[-100px] left-1/4" />

      {/* Auth card */}
      <div className="relative z-20 w-full max-w-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">Welcome to Gaplets</h1>
          <p className="text-muted-foreground text-sm mt-1">Automate. Notify. Fill the gap.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
