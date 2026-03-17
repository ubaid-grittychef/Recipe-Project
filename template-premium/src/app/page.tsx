import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllRecipes, getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji } from "@/lib/utils";
import { Star, Clock, ArrowRight, Flame } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: siteConfig.tagline ? `${siteConfig.name} | ${siteConfig.tagline}` : siteConfig.name },
  description: siteConfig.description || `Discover copycat recipes at ${siteConfig.name}. Recreate your favorite restaurant dishes at home.`,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description || `Discover copycat recipes at ${siteConfig.name}.`,
    url: siteConfig.url,
    type: "website",
    ...(siteConfig.ogImage && {
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    }),
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description || `Discover copycat recipes at ${siteConfig.name}.`,
    ...(siteConfig.ogImage && { images: [siteConfig.ogImage] }),
  },
  alternates: { canonical: siteConfig.url },
};

export default async function HomePage() {
  const [recipes, categories] = await Promise.all([getAllRecipes(), getCategories()]);
  const featured = recipes[0];
  const latest = recipes.slice(1, 7);
  const topCategories = categories.slice(0, 6);

  return (
    <div className="bg-slate-950">
      {/* Hero */}
      {featured && (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            {featured.image_url && (
              <Image src={featured.image_url} alt={featured.title} fill className="object-cover opacity-30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-36">
            <div className="max-w-2xl">
              {featured.category && (
                <span className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: siteConfig.primaryColor }}>
                  {getCategoryEmoji(featured.category)} {featured.category}
                </span>
              )}
              <h1 className="sr-only">
                {siteConfig.tagline ? `${siteConfig.name} — ${siteConfig.tagline}` : siteConfig.name}
              </h1>
              <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-lg text-slate-300 line-clamp-2">{featured.description}</p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-sm text-slate-400">{featured.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  {featured.total_time}
                </div>
              </div>
              <Link
                href={`/recipe/${featured.slug}`}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: siteConfig.primaryColor }}
              >
                View Recipe <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-white">Browse by Category</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {topCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <span>{getCategoryEmoji(cat.name)}</span>
                <span>{cat.name}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest recipes grid */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-white">
              <Flame className="mr-2 inline-block h-6 w-6 text-orange-500" />
              Latest Recipes
            </h2>
            <Link href="/recipes" className="text-sm text-slate-400 hover:text-white">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition-all hover:border-white/20 hover:shadow-xl hover:shadow-black/50"
              >
                <div className="relative h-48 overflow-hidden">
                  {recipe.image_url ? (
                    <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-800 text-4xl">
                      {recipe.category ? getCategoryEmoji(recipe.category) : "🍽️"}
                    </div>
                  )}
                  {recipe.category && (
                    <span className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: siteConfig.primaryColor }}>
                      {recipe.category}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-lg font-bold leading-snug text-white group-hover:text-primary-500 transition-colors">
                    {recipe.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">{recipe.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{recipe.total_time}</span>
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{recipe.rating}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 text-center">
          <p className="text-6xl">🍽️</p>
          <h1 className="mt-6 font-heading text-3xl font-bold text-white">{siteConfig.name}</h1>
          <p className="mt-3 text-slate-400">{siteConfig.tagline || "Recipes coming soon."}</p>
        </div>
      )}
    </div>
  );
}
