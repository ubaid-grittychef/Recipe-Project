import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import Script from "next/script";
import Link from "next/link";
import PremiumNav from "@/components/PremiumNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.primaryColor,
};

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    ...(siteConfig.ogImage && {
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    }),
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    ...(siteConfig.ogImage && { images: [siteConfig.ogImage] }),
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${poppins.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: siteConfig.url }).replace(/<\//g, "<\\/") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: siteConfig.url, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.url}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" } }).replace(/<\//g, "<\\/") }} />
      </head>
      <body className={inter.className}>
        {/* Premium dark header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: siteConfig.primaryColor }}>
                {siteConfig.name.charAt(0)}
              </div>
              <span className="text-lg font-bold text-white">{siteConfig.name}</span>
            </Link>
            <PremiumNav />
            <Link href="/search" className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/20">
              Search
            </Link>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        {/* Premium footer */}
        <footer className="mt-20 border-t border-white/10 bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: siteConfig.primaryColor }}>
                    {siteConfig.name.charAt(0)}
                  </div>
                  <span className="text-lg font-bold text-white">{siteConfig.name}</span>
                </div>
                {siteConfig.tagline && (
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">{siteConfig.tagline}</p>
                )}
                <p className="mt-4 text-sm text-slate-600">Bringing restaurant flavors to your home kitchen.</p>
              </div>

              {/* Explore */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explore</h4>
                <ul className="mt-4 space-y-2.5">
                  {[["/" , "Home"], ["/recipes", "All Recipes"], ["/categories", "Categories"], ["/search", "Search"], ["/about", "About"]].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-slate-500 transition-colors hover:text-white">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</h4>
                <ul className="mt-4 space-y-2.5">
                  {[["/privacy", "Privacy Policy"], ["/terms", "Terms of Use"], ["/sitemap", "Sitemap"]].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-slate-500 transition-colors hover:text-white">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5">
            <div className="mx-auto max-w-7xl px-4 py-5">
              <p className="text-center text-xs text-slate-700">© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
            </div>
          </div>
        </footer>

        {siteConfig.adsenseId && (
          <Script src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${siteConfig.adsenseId}`} strategy="afterInteractive" crossOrigin="anonymous" />
        )}
        {siteConfig.skimlinksId && (
          <Script src={`https://s.skimresources.com/js/${siteConfig.skimlinksId}.skimlinks.js`} strategy="afterInteractive" />
        )}
        {siteConfig.gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`} strategy="afterInteractive" />
            <Script id="gtag-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${siteConfig.gaId}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
