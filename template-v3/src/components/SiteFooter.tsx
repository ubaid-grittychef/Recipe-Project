import Link from "next/link";
import { siteConfig } from "@/lib/config";

export default function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-ink bg-white mt-16">
      <div className="max-w-site mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-rule">
          {/* Brand */}
          <div>
            <div className="font-serif text-[18px] font-black text-ink mb-3">
              {siteConfig.name}
              <span className="text-red">.</span>
            </div>
            <p className="text-[13px] text-ink-4 leading-relaxed">
              {siteConfig.description || "Restaurant-quality copycat recipes made at home. Every night."}
            </p>
          </div>

          {/* Recipes */}
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-4">Recipes</div>
            <ul className="space-y-2.5">
              <li><Link href="/recipes" className="text-[13px] text-ink-3 hover:text-red transition-colors">All Recipes</Link></li>
              <li><Link href="/categories" className="text-[13px] text-ink-3 hover:text-red transition-colors">Categories</Link></li>
              <li><Link href="/search" className="text-[13px] text-ink-3 hover:text-red transition-colors">Search</Link></li>
            </ul>
          </div>

          {/* Site */}
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-4">Site</div>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-[13px] text-ink-3 hover:text-red transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-[13px] text-ink-3 hover:text-red transition-colors">About</Link></li>
              <li><Link href="/sitemap" className="text-[13px] text-ink-3 hover:text-red transition-colors">Sitemap</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-4">Legal</div>
            <ul className="space-y-2.5">
              <li><Link href="/privacy" className="text-[13px] text-ink-3 hover:text-red transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-[13px] text-ink-3 hover:text-red transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <p className="text-[12px] text-ink-4">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-[12px] text-ink-4 hover:text-red transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-ink-4 hover:text-red transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
