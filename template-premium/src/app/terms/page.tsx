import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Use",
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsPage() {
  const siteName = siteConfig.name;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-white">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-600">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="mt-8 space-y-6 text-slate-400 leading-relaxed">
        <p>Welcome to {siteName}. By accessing and using this website, you accept and agree to be bound by the terms and conditions outlined below.</p>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Use of Content</h2>
          <p>All recipes, text, images, and other content on this site are provided for personal, non-commercial use only. You may not reproduce, distribute, or republish content without prior written permission.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Recipe Disclaimer</h2>
          <p>The recipes on this site are provided &quot;as is&quot; for informational and entertainment purposes. Nutritional information is approximate and should not be relied upon for dietary or medical purposes.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Allergen Notice</h2>
          <p>Recipes may contain common allergens including wheat, eggs, dairy, soy, tree nuts, peanuts, fish, and shellfish. Always check ingredient labels and consult a medical professional if you have food allergies.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Copycat Recipes</h2>
          <p>Any recipes described as &quot;copycat&quot; or inspired by restaurant dishes are our own interpretations and are not endorsed by or affiliated with the referenced restaurants or brands. All restaurant and brand names are trademarks of their respective owners.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Affiliate Links &amp; Advertising</h2>
          <p>This site may contain affiliate links and display advertisements. We may earn a commission when you click affiliate links and make purchases. See our{" "}
            <Link href="/privacy" className="text-slate-300 hover:text-white">Privacy Policy</Link> for details.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Limitation of Liability</h2>
          <p>{siteName} shall not be liable for any damages arising from the use of or inability to use this website or any content provided herein.</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-white">Contact</h2>
          <p>Questions about these Terms? Visit our <Link href="/about" className="text-slate-300 hover:text-white">About page</Link>.</p>
        </div>
      </div>
    </article>
  );
}
