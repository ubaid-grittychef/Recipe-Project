import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { User, Target, Shield, ChefHat, Star, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

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
    <>
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-200 opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-amber-200 opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div
            className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <ChefHat className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            About {siteConfig.name}
          </h1>
          {siteConfig.tagline && (
            <p className="mt-4 text-lg text-slate-600">{siteConfig.tagline}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {/* Stats row */}
        <div className="mb-12 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
          {[
            { icon: BookOpen, label: "Recipes", value: "500+" },
            { icon: Star, label: "Avg Rating", value: "4.8★" },
            { icon: Clock, label: "Avg Cook Time", value: "30 min" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center py-6">
              <Icon className="h-5 w-5 text-orange-400" />
              <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Author */}
          {siteConfig.author && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: siteConfig.primaryColor }}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Meet the Author</h2>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    {siteConfig.name} is created and maintained by{" "}
                    <strong>{siteConfig.author}</strong>. We bring you tested copycat
                    recipes and cooking inspiration to recreate your favorite restaurant
                    dishes at home.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Mission */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: siteConfig.primaryColor }}
              >
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Our Mission</h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  {siteConfig.description ||
                    "Our mission is to help home cooks recreate their favorite restaurant meals with clear, step-by-step recipes. We focus on accuracy, ease of use, and delicious results."}
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Disclaimer</h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  This site may contain affiliate links. When you click on certain links
                  and make a purchase, we may receive a small commission at no extra cost
                  to you. This helps us keep the site running and continue creating free
                  recipes for you. All opinions are our own.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Recipe names and brands mentioned are trademarks of their respective
                  owners. We are not affiliated with any restaurant or brand. Our recipes
                  are inspired recreations for home cooking.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-8 text-center text-white shadow-lg sm:flex-row sm:text-left">
            <ChefHat className="h-10 w-10 shrink-0 opacity-80" />
            <div className="flex-1">
              <p className="font-bold text-lg">Ready to start cooking?</p>
              <p className="mt-1 text-sm text-white/80">Browse our full recipe collection and find your next favorite dish.</p>
            </div>
            <Link
              href="/recipes"
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow transition-colors hover:bg-orange-50"
            >
              Browse Recipes
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
