import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${siteConfig.name}.`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export default function PrivacyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="bg-bg min-h-screen">
      <div className="border-b-[3px] border-ink bg-white py-10">
        <div className="max-w-[720px] mx-auto px-6">
          <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-red mb-3">Legal</p>
          <h1 className="font-serif text-[36px] font-black text-ink tracking-[-1px]">Privacy Policy</h1>
          <p className="text-[13px] text-ink-4 mt-2">Last updated: {year}</p>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="space-y-8 text-[14px] text-ink-2 leading-[1.85]">

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Information We Collect</h2>
            <p>
              {siteConfig.name} collects minimal data necessary to operate the site. This may include technical information such as IP addresses, browser type, and pages visited, collected automatically via standard web server logs and analytics tools.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to improve your experience on our site. This includes analytics cookies (e.g., Google Analytics) that help us understand how visitors use the site. You may disable cookies in your browser settings, though this may affect certain functionality.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Advertising</h2>
            <p>
              We may display advertising provided by third parties including Google AdSense. These third parties may use cookies to serve ads based on your prior visits to our site and other websites. You can opt out of personalized advertising by visiting{" "}
              <a href="https://www.google.com/settings/ads" className="text-red hover:text-red-dark underline" target="_blank" rel="noopener noreferrer">
                Google Ads Settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Affiliate Links</h2>
            <p>
              Some links on this site are affiliate links. When you purchase through these links, we may earn a commission at no extra cost to you. We only recommend products and services we genuinely believe in.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Third-Party Links</h2>
            <p>
              Our site may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites. We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Data Retention</h2>
            <p>
              We do not collect or store personal user accounts or profile data. Any analytics data is retained in accordance with the policies of our analytics provider (Google Analytics).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Contact</h2>
            <p>
              If you have questions about this privacy policy, please contact us through the information provided on our{" "}
              <a href="/about" className="text-red hover:text-red-dark underline">About page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
