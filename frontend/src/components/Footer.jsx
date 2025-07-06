import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border px-4 py-12 text-sm text-muted-foreground shadow-[0_0_60px_rgba(0,0,0,0.2)]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
        {/* Product */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Product</h4>
          <ul className="space-y-1">
            <li><Link href="#HowItWorks" className="hover:underline">How it works</Link></li>
            <li><Link href="#SetUp" className="hover:underline">SetUp</Link></li>
            <li><Link href="#Pricing" className="hover:underline">Pricing</Link></li>
            <li><Link href="#Demo" className="hover:underline">Demo</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Company</h4>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:underline">About us</Link></li>
            <li><Link href="/blog" className="hover:underline">Blog</Link></li>
            <li><Link href="/about/#Contact" className="hover:underline">Contact</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Legal</h4>
          <ul className="space-y-1">
            <li><Link href="/terms" className="hover:underline">Terms & Conditions</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Support</h4>
          <ul className="space-y-1">
            <li>
              <a href="mailto:support@gaplets.com" className="hover:underline">
                support@gaplets.com
              </a>
            </li>
            <li><Link href="#FAQ" className="hover:underline">Help Center / FAQ</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 text-center text-xs text-muted-foreground">
        <p>© 2025 Gaplets Inc. All rights reserved.</p>
      </div>
    </footer>
  )
}
