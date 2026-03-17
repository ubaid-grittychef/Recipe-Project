import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { FileText, Calendar } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sitemap",
  description: `Complete list of all recipes on ${siteConfig.name}. Browse our recipe archive by date.`,
  metadataBase: new URL(siteConfig.url),
  robots: {
    index: true,
    follow: true,
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function groupByMonth(recipes: { slug: string; title: string; published_at: string | null }[]) {
  const groups = new Map<string, typeof recipes>();
  for (const r of recipes) {
    const date = r.published_at ? new Date(r.published_at) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default async function SitemapPage() {
  const recipes = await getAllRecipes();
  const grouped = groupByMonth(
    recipes.map((r) => ({
      slug: r.slug,
      title: r.title,
      published_at: r.published_at,
    }))
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-12">
        <div
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Recipe Sitemap
        </h1>
        <p className="mt-2 text-slate-600">
          All {recipes.length} recipes organized by date
        </p>
      </div>

      {/* Quick links */}
      <div className="mb-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-primary-200 hover:bg-primary-50"
        >
          Home
        </Link>
        <Link
          href="/categories"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-primary-200 hover:bg-primary-50"
        >
          Categories
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-primary-200 hover:bg-primary-50"
        >
          About
        </Link>
      </div>

      {/* Recipes by date */}
      {recipes.length > 0 ? (
        <div className="space-y-10">
          {grouped.map(([monthKey, monthRecipes]) => {
            const [year, month] = monthKey.split("-");
            const monthName = new Date(
              parseInt(year),
              parseInt(month) - 1
            ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <section key={monthKey}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Calendar className="h-5 w-5 text-primary-500" />
                  {monthName}
                </h2>
                <ul className="space-y-2">
                  {monthRecipes.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/recipe/${r.slug}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 text-slate-700 transition-colors hover:border-primary-100 hover:bg-primary-50/50"
                      >
                        <span className="font-medium">{r.title}</span>
                        <span className="text-xs text-slate-400">
                          {formatDate(r.published_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-200" />
          <p className="mt-4 text-slate-600">No recipes yet.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
