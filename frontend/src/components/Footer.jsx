import Link from "next/link";

const PRICING_PATH = "/price"; // <- si usas /pricing, cámbialo aquí

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border px-4 py-12 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">

        {/* Product */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Product</h4>
          <ul className="space-y-1">
            <li><Link href="/how-it-works" className="hover:underline">How it works</Link></li>
            <li><Link href="/features" className="hover:underline">Features</Link></li>
            <li><Link href="/use-cases" className="hover:underline">Use cases</Link></li>
            <li><Link href="/integrations" className="hover:underline">Integrations</Link></li>
            <li><Link href="/testimonials" className="hover:underline">Testimonials</Link></li>
            <li><Link href={PRICING_PATH} className="hover:underline">Pricing</Link></li>
            {/* Si tienes la demo como sección del Home:
            <li><Link href="/#Demo" className="hover:underline">Demo</Link></li> */}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Resources</h4>
          <ul className="space-y-1">
            <li><Link href="/docs/faq" className="hover:underline">Help Center / FAQ</Link></li>
            <li><Link href="/security" className="hover:underline">Security & compliance</Link></li>
            <li><Link href="/blog" className="hover:underline">Blog</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Company</h4>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:underline">About</Link></li>
            <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            <li><a href="mailto:support@gaplets.com" className="hover:underline">support@gaplets.com</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-foreground mb-3">Legal</h4>
          <ul className="space-y-1">
            <li><Link href="/terms" className="hover:underline">Terms</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
          </ul>
        </div>

      </div>

      <div className="mt-10 text-center text-xs text-muted-foreground">
        <p>© 2025 Gaplets Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
