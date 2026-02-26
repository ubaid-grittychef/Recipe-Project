import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { User, Target, Shield, ChefHat } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${siteConfig.name}. Our mission, author credentials, and commitment to trustworthy recipe content.`,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: `About | ${siteConfig.name}`,
    description: siteConfig.description,
    url: `${siteConfig.url}/about`,
  },
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <div
          className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          <ChefHat className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          About {siteConfig.name}
        </h1>
        <p className="mt-3 text-lg text-slate-600">{siteConfig.tagline}</p>
      </div>

      <div className="space-y-12">
        {/* Author / Expertise */}
        {siteConfig.author && (
          <section className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: siteConfig.primaryColor }}
              >
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Meet the Author
                </h2>
                <p className="mt-2 text-slate-600">
                  {siteConfig.name} is created and maintained by{" "}
                  <strong>{siteConfig.author}</strong>. We bring you tested
                  copycat recipes and cooking inspiration to recreate your
                  favorite restaurant dishes at home.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Mission */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: siteConfig.primaryColor }}
            >
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
              <p className="mt-2 text-slate-600">
                {siteConfig.description || (
                  <>
                    Our mission is to help home cooks recreate their favorite
                    restaurant meals with clear, step-by-step recipes. We focus
                    on accuracy, ease of use, and delicious results.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: siteConfig.primaryColor }}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Disclaimer</h2>
              <p className="mt-2 text-slate-600">
                This site may contain affiliate links. When you click on certain
                links and make a purchase, we may receive a small commission at
                no extra cost to you. This helps us keep the site running and
                continue creating free recipes for you. We only recommend
                products and services we believe add value. All opinions are our
                own.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Recipe names and brands mentioned are trademarks of their
                respective owners. We are not affiliated with any restaurant or
                brand. Our recipes are inspired recreations for home cooking.
              </p>
            </div>
          </div>
        </section>

        {/* Contact / URL */}
        {siteConfig.url && (
          <p className="text-center text-sm text-slate-500">
            Visit us at{" "}
            <a
              href={siteConfig.url}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {siteConfig.url.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
