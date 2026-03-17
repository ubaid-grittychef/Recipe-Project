import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${siteConfig.name}. Our mission, story, and commitment to quality copycat recipes.`,
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: `About | ${siteConfig.name}`,
    description: siteConfig.description,
    url: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="bg-bg min-h-screen">

      {/* ── Masthead ─────────────────────────────────── */}
      <div className="border-b-[3px] border-ink bg-white py-12">
        <div className="max-w-site mx-auto px-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="h-px flex-1 bg-ink" />
            <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-3">Our Story</span>
            <div className="h-px flex-1 bg-ink" />
          </div>
          <h1 className="font-serif text-[40px] font-black text-ink tracking-[-1px] text-center">
            About {siteConfig.name}
          </h1>
          {siteConfig.tagline && (
            <p className="text-center text-[15px] text-ink-3 mt-3">{siteConfig.tagline}</p>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="max-w-[720px] mx-auto px-6 py-14">

        {/* Mission */}
        <div className="mb-10 border-l-[4px] border-red pl-6">
          <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-red mb-3">Our Mission</p>
          <p className="text-[16px] text-ink-2 leading-[1.85]">
            {siteConfig.description ||
              `${siteConfig.name} brings you tested, step-by-step copycat recipes from the world's most popular restaurants — so you can recreate your favourite restaurant meals at home, with real ingredients and exact flavours.`}
          </p>
        </div>

        {/* What we do */}
        <div className="border border-rule mb-8">
          <div className="border-b border-rule px-6 py-4 bg-bg-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-ink-4">What We Do</p>
          </div>
          <div className="divide-y divide-rule">
            {[
              { label: "Tested Recipes", desc: "Every recipe is carefully developed to match the flavours you love from your favourite restaurants." },
              { label: "Clear Instructions", desc: "Step-by-step instructions written for home cooks — no culinary degree required." },
              { label: "Real Ingredients", desc: "We use ingredients you can find at any grocery store. No specialty sourcing needed." },
              { label: "Honest Content", desc: "We're food enthusiasts, not affiliated with any restaurant or brand. Our recreations are independent." },
            ].map((item) => (
              <div key={item.label} className="px-6 py-5">
                <p className="text-[13px] font-extrabold text-ink mb-1">{item.label}</p>
                <p className="text-[13px] text-ink-3 leading-[1.7]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Author */}
        {siteConfig.author && (
          <div className="border border-rule mb-8 p-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-red mb-3">Author</p>
            <p className="text-[15px] text-ink-2 leading-[1.8]">
              {siteConfig.name} is created and maintained by{" "}
              <strong className="text-ink">{siteConfig.author}</strong>.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="border border-rule border-l-[4px] border-l-ink-4 bg-bg-2 p-6 mb-10">
          <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-3">Disclaimer</p>
          <p className="text-[13px] text-ink-3 leading-[1.75] mb-3">
            This site may contain affiliate links. When you click on certain links and make a purchase, we may receive a small commission at no extra cost to you. This helps us keep the site running and continue creating free recipes.
          </p>
          <p className="text-[12px] text-ink-4 leading-[1.7]">
            Recipe names and brands mentioned are trademarks of their respective owners. We are not affiliated with any restaurant or brand. Our recipes are inspired recreations for home cooking.
          </p>
        </div>

        {/* CTA */}
        <div className="border-[3px] border-ink bg-white p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-serif text-[22px] font-black text-ink tracking-[-0.3px]">Ready to start cooking?</p>
            <p className="text-[14px] text-ink-3 mt-1">Browse our full recipe collection.</p>
          </div>
          <Link href="/recipes" className="btn-red flex items-center gap-2 shrink-0">
            Browse Recipes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
