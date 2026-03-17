import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use for ${siteConfig.name}.`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsPage() {
  const year = new Date().getFullYear();

  return (
    <div className="bg-bg min-h-screen">
      <div className="border-b-[3px] border-ink bg-white py-10">
        <div className="max-w-[720px] mx-auto px-6">
          <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-red mb-3">Legal</p>
          <h1 className="font-serif text-[36px] font-black text-ink tracking-[-1px]">Terms of Use</h1>
          <p className="text-[13px] text-ink-4 mt-2">Last updated: {year}</p>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="space-y-8 text-[14px] text-ink-2 leading-[1.85]">

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Acceptance of Terms</h2>
            <p>
              By accessing and using {siteConfig.name}, you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use this site.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Use of Content</h2>
            <p>
              All recipes, text, images, and other content on {siteConfig.name} are provided for personal, non-commercial use only. You may not reproduce, distribute, or use any content from this site for commercial purposes without explicit written permission.
            </p>
            <p className="mt-3">
              You are welcome to share recipes with friends and family, link to our pages, or use individual recipes for personal home cooking.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Intellectual Property</h2>
            <p>
              Recipe names, brand names, and trademarks referenced on this site are the property of their respective owners. {siteConfig.name} is not affiliated with, endorsed by, or connected to any restaurant chain or food brand mentioned on this site. Our recipes are original recreations inspired by popular restaurant dishes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Disclaimer of Warranties</h2>
            <p>
              The content on this site is provided &ldquo;as is&rdquo; without warranties of any kind. We make no guarantees about the accuracy, completeness, or suitability of recipe information. Cooking results may vary based on equipment, ingredients, and technique.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Limitation of Liability</h2>
            <p>
              {siteConfig.name} shall not be liable for any damages arising from the use of recipes or content on this site, including but not limited to food allergies, dietary concerns, or cooking accidents. Always exercise proper food safety practices.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">External Links</h2>
            <p>
              This site contains links to external websites. We are not responsible for the content, accuracy, or practices of any third-party sites. Links to external sites do not constitute endorsement.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Changes to Terms</h2>
            <p>
              We reserve the right to update these terms at any time. Continued use of the site after changes constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[18px] font-black text-ink mb-3 pb-2 border-b border-rule">Contact</h2>
            <p>
              For questions about these terms, please visit our{" "}
              <a href="/about" className="text-red hover:text-red-dark underline">About page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
