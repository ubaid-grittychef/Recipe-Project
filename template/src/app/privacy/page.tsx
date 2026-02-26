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
      <h1 className="text-3xl font-extrabold text-slate-900">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-slate mt-8 max-w-none">
        <p>
          {siteName} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          operates the website at{" "}
          <Link href="/" className="text-primary-600">
            {siteUrl}
          </Link>
          . This page informs you of our policies regarding the collection, use,
          and disclosure of personal information when you use our site.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We do not require you to create an account or provide personal
          information to browse our recipes. We may automatically collect:
        </p>
        <ul>
          <li>
            <strong>Log data</strong> — your browser type, operating system,
            referring page, pages viewed, and the date/time of your visit.
          </li>
          <li>
            <strong>Cookies</strong> — small files stored on your device to
            improve your browsing experience and for analytics purposes.
          </li>
        </ul>

        {hasAnalytics && (
          <>
            <h2>Analytics</h2>
            <p>
              We use Google Analytics to understand how visitors interact with
              our site. Google Analytics collects information such as how often
              you visit, what pages you view, and what other sites you visited
              before coming here. We use this information solely to improve our
              site. Google Analytics uses cookies and does not collect personally
              identifiable information. You can opt out by installing the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>
          </>
        )}

        {hasAds && (
          <>
            <h2>Advertising</h2>
            <p>
              We use Google AdSense to display advertisements on our site. Google
              AdSense may use cookies and web beacons to serve ads based on your
              prior visits to this or other websites. You may opt out of
              personalised advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Ads Settings
              </a>
              .
            </p>
          </>
        )}

        {hasAffiliates && (
          <>
            <h2>Affiliate Links</h2>
            <p>
              Some links on this site are affiliate links. When you click these
              links and make a purchase, we may receive a small commission at no
              additional cost to you. This helps us keep the site running and
              continue creating free recipes.
              {siteConfig.amazonTag &&
                " As an Amazon Associate, we earn from qualifying purchases."}
            </p>
          </>
        )}

        <h2>Third-Party Services</h2>
        <p>
          We may employ third-party companies and individuals to facilitate our
          website, provide services on our behalf, or assist us in analysing how
          our site is used. These third parties have access to limited
          information only to perform these tasks and are obligated not to
          disclose or use it for any other purpose.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Our site does not address anyone under the age of 13. We do not
          knowingly collect personally identifiable information from children
          under 13.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the &quot;Last updated&quot; date.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          through our{" "}
          <Link href="/about" className="text-primary-600">
            About page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
