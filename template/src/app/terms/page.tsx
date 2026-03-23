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
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-400">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
        <p>
          Welcome to {siteName}. By accessing and using this website, you accept
          and agree to be bound by the terms and conditions outlined below.
        </p>

        <h2>Use of Content</h2>
        <p>
          All recipes, text, images, and other content on this site are provided
          for personal, non-commercial use only. You may view, print, and
          download recipes for your own personal use. You may not reproduce,
          distribute, or republish content from this site without prior written
          permission.
        </p>

        <h2>Recipe Disclaimer</h2>
        <p>
          The recipes on this site are provided &quot;as is&quot; for
          informational and entertainment purposes. While we strive for accuracy,
          we make no warranties about the completeness, reliability, or accuracy
          of the information. Nutritional information is approximate and should
          not be relied upon for dietary or medical purposes. Always consult a
          qualified professional for dietary advice.
        </p>

        <h2>Allergen Notice</h2>
        <p>
          Recipes may contain or come into contact with common allergens
          including wheat, eggs, dairy, soy, tree nuts, peanuts, fish, and
          shellfish. Always check ingredient labels and consult with a medical
          professional if you have food allergies.
        </p>

        <h2>Copycat Recipes</h2>
        <p>
          Any recipes described as &quot;copycat&quot; or inspired by restaurant
          dishes are our own interpretations and are not endorsed by, affiliated
          with, or sponsored by the referenced restaurants or brands. All
          restaurant and brand names are trademarks of their respective owners.
        </p>

        <h2>Affiliate Links & Advertising</h2>
        <p>
          This site may contain affiliate links and display advertisements. We
          may earn a commission when you click affiliate links and make
          purchases. This does not affect the price you pay. For more details,
          see our{" "}
          <Link href="/privacy" className="text-primary-600">
            Privacy Policy
          </Link>
          .
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          {siteName} shall not be liable for any damages arising from the use of
          or inability to use this website or any content provided herein. This
          includes, but is not limited to, direct, indirect, incidental,
          punitive, and consequential damages.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Changes will be
          posted on this page with an updated revision date. Your continued use
          of the site after changes constitutes acceptance of the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms of Use? Visit our{" "}
          <Link href="/about" className="text-primary-600">
            About page
          </Link>{" "}
          for contact information.
        </p>
      </div>
    </article>
  );
}
