import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export default function PrivacyPage() {
  const siteName = siteConfig.name;
  const siteUrl = siteConfig.url;
  const hasAds = !!siteConfig.adsenseId;
  const hasAffiliates = !!(siteConfig.amazonTag || siteConfig.skimlinksId);
  const hasAnalytics = !!siteConfig.gaId;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-600">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="mt-8 space-y-6 text-slate-400 leading-relaxed">
        <p>
          {siteName} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website at{" "}
          <Link href="/" className="text-slate-300 hover:text-white">{siteUrl}</Link>. This page informs you of our
          policies regarding the collection, use, and disclosure of personal information when you use our site.
        </p>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Information We Collect</h2>
          <p>We do not require you to create an account or provide personal information to browse our recipes. We may automatically collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong className="text-slate-300">Log data</strong> — your browser type, operating system, referring page, pages viewed, and the date/time of your visit.</li>
            <li><strong className="text-slate-300">Cookies</strong> — small files stored on your device to improve your browsing experience and for analytics purposes.</li>
          </ul>
        </div>

        {hasAnalytics && (
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Analytics</h2>
            <p>We use Google Analytics to understand how visitors interact with our site. Google Analytics collects information such as how often you visit and what pages you view. You can opt out by installing the{" "}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white">Google Analytics Opt-out Browser Add-on</a>.
            </p>
          </div>
        )}

        {hasAds && (
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Advertising</h2>
            <p>We use Google AdSense to display advertisements. Google AdSense may use cookies and web beacons to serve personalised ads. You may opt out at{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white">Google Ads Settings</a>.
            </p>
          </div>
        )}

        {hasAffiliates && (
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Affiliate Links</h2>
            <p>Some links on this site are affiliate links. When you click these links and make a purchase, we may receive a small commission at no additional cost to you.
              {siteConfig.amazonTag && " As an Amazon Associate, we earn from qualifying purchases."}
            </p>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Changes to This Policy</h2>
          <p>We may update our Privacy Policy from time to time. Changes will be posted on this page with an updated date.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Contact Us</h2>
          <p>Questions? Visit our <Link href="/about" className="text-slate-300 hover:text-white">About page</Link>.</p>
        </div>
      </div>
    </article>
  );
}
