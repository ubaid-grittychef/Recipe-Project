import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji } from "@/lib/utils";
import RecipeCard from "@/components/RecipeCard";
import HeroSearch from "@/components/HeroSearch";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: siteConfig.tagline ? `${siteConfig.name} | ${siteConfig.tagline}` : siteConfig.name },
  alternates: { canonical: siteConfig.url },
};

export default async function HomePage() {
  const [recipes, categories, restaurants] = await Promise.all([
    getAllRecipes(),
    getCategories(),
    getRestaurantNames(),
  ]);

  const picks = recipes.slice(0, 4);
  const featured = recipes.slice(0, 4);
  const staffPick = recipes[4] ?? recipes[0];
  const latest = recipes.slice(5, 9);
  const heroImages = recipes.slice(0, 3);

  return (
    <div className="bg-bg">

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="border-b-[3px] border-ink">

        {/* Masthead rule bar */}
        <div className="max-w-site mx-auto px-6 py-5 flex items-center gap-5 border-b border-ink">
          <div className="h-px flex-1 bg-ink" />
          <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-3 shrink-0">
            est. {new Date().getFullYear()} · Restaurant Copycat Recipes
          </span>
          <div className="h-px flex-1 bg-ink" />
          {recipes.length > 0 && (
            <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] border border-red text-red px-3 py-1 shrink-0">
              {recipes.length} Recipes
            </span>
          )}
        </div>

        {/* Hero grid */}
        <div className="max-w-site mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_1px_320px] gap-0">

          {/* Left: headline + search */}
          <div className="py-10 pr-0 lg:pr-10">
            <p className="sec-eyebrow mb-4 flex items-center gap-2">
              Today's Feature
              <span className="h-px flex-1 bg-red-bg max-w-[48px]" />
            </p>
            <h1 className="font-serif text-[52px] sm:text-[64px] font-black text-ink leading-[1.02] tracking-[-2px] mb-5">
              Cook Your<br />
              Favourite{" "}
              <em className="text-red not-italic">Restaurant</em><br />
              Meals at Home.
            </h1>
            <p className="text-[15px] text-ink-3 leading-[1.75] mb-8 max-w-[480px]">
              {siteConfig.description || `${recipes.length} copycat recipes from the world's most popular restaurants. Exact flavours, real ingredients, your kitchen.`}
            </p>

            {/* Stats */}
            {recipes.length > 0 && (
              <div className="flex gap-8 mb-8 pb-8 border-b border-rule-light">
                <div>
                  <div className="font-serif text-[32px] font-black text-ink leading-none tracking-[-1px]">{recipes.length}</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ink-4 mt-1">Recipes</div>
                </div>
                {restaurants.length > 0 && (
                  <div>
                    <div className="font-serif text-[32px] font-black text-ink leading-none tracking-[-1px]">{restaurants.length}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ink-4 mt-1">Restaurants</div>
                  </div>
                )}
                {categories.length > 0 && (
                  <div>
                    <div className="font-serif text-[32px] font-black text-ink leading-none tracking-[-1px]">{categories.length}</div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ink-4 mt-1">Categories</div>
                  </div>
                )}
              </div>
            )}

            <HeroSearch />
          </div>

          {/* Divider */}
          <div className="hidden lg:block bg-rule" />

          {/* Right: sidebar picks */}
          {picks.length > 0 && (
            <div className="hidden lg:block py-10 pl-10">
              <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 pb-3 border-b border-ink mb-0">
                Editor's Picks
              </div>
              {picks.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/recipe/${r.slug}`}
                  className="flex gap-3 py-4 border-b border-rule-light hover:bg-bg-2 -mx-2 px-2 transition-colors group"
                >
                  <span className="font-serif text-[22px] font-black text-bg-3 leading-none min-w-[28px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    {r.category && <p className="sec-eyebrow mb-1">{r.category}</p>}
                    <p className="font-serif text-[14px] font-bold text-ink leading-[1.3] group-hover:text-red transition-colors line-clamp-2">
                      {r.title}
                    </p>
                    <p className="text-[11px] text-ink-4 mt-1.5 font-semibold">
                      {r.total_time && `⏱ ${r.total_time}`}
                      {r.rating && r.rating > 0 && ` · ★ ${r.rating.toFixed(1)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Image strip */}
        {heroImages.length > 0 && (
          <div className="max-w-site mx-auto grid grid-cols-3 border-t border-rule h-[220px] sm:h-[260px]">
            {heroImages.map((r, i) => (
              <Link
                key={r.id}
                href={`/recipe/${r.slug}`}
                className={`relative overflow-hidden bg-bg-2 ${i < heroImages.length - 1 ? "border-r border-rule" : ""} group`}
              >
                {r.image_url ? (
                  <Image
                    src={r.image_url}
                    alt={`${r.title} recipe`}
                    fill
                    sizes="33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">🍽️</div>
                )}
                {i === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.65))" }}>
                    <span className="inline-block bg-red text-white text-[9px] font-extrabold uppercase tracking-[1.5px] px-2 py-0.5 mb-2">
                      Most Made
                    </span>
                    <p className="font-serif text-[16px] font-bold text-white leading-[1.2] line-clamp-2">
                      {r.title}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── FEATURED RECIPES ───────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-site mx-auto px-6 py-14">
          <div className="sec-hd">
            <div>
              <p className="sec-eyebrow">Most Popular</p>
              <h2 className="sec-title">Fan Favourite Recipes</h2>
            </div>
            <Link href="/recipes" className="sec-link flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-rule">
            {featured.map((r, i) => (
              <div key={r.id} className={`${i < featured.length - 1 ? "border-r border-rule" : ""}`}>
                <RecipeCard recipe={r} rank={i + 1} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── STAFF PICK (large horizontal) ──────────────── */}
      {staffPick && (
        <section className="bg-bg-2 border-y border-rule py-14">
          <div className="max-w-site mx-auto px-6">
            <div className="sec-hd">
              <div>
                <p className="sec-eyebrow">Staff Pick</p>
                <h2 className="sec-title">This Week's Feature</h2>
              </div>
            </div>
            <Link
              href={`/recipe/${staffPick.slug}`}
              className="sweep-top grid grid-cols-1 md:grid-cols-2 border border-rule group"
            >
              <div className="relative aspect-[4/3] md:aspect-auto bg-bg-3 overflow-hidden">
                {staffPick.image_url ? (
                  <Image
                    src={staffPick.image_url}
                    alt={`${staffPick.title} recipe`}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">🍽️</div>
                )}
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                {staffPick.category && <p className="sec-eyebrow mb-3">{staffPick.category}</p>}
                <h3 className="font-serif text-[26px] font-black text-ink leading-[1.1] tracking-[-0.5px] mb-3 group-hover:text-red transition-colors">
                  {staffPick.title}
                </h3>
                <div className="flex gap-3 text-[12px] font-semibold text-ink-4 mb-5">
                  {staffPick.total_time && <span>⏱ {staffPick.total_time}</span>}
                  {staffPick.servings && <span>👤 {staffPick.servings} servings</span>}
                  {staffPick.rating && staffPick.rating > 0 && <span className="text-amber-600 font-bold">★ {staffPick.rating.toFixed(1)}</span>}
                </div>
                {staffPick.description && (
                  <p className="text-[14px] text-ink-3 leading-[1.75] mb-6 line-clamp-3">{staffPick.description}</p>
                )}
                <span className="btn-red self-start">View Full Recipe</span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── CATEGORIES ─────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-site mx-auto px-6 py-14">
          <div className="sec-hd">
            <div>
              <p className="sec-eyebrow">Explore</p>
              <h2 className="sec-title">Browse by Category</h2>
            </div>
            <Link href="/categories" className="sec-link flex items-center gap-1">
              All Categories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-rule">
            {categories.slice(0, 12).map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`relative flex flex-col items-center py-6 px-3 text-center group hover:bg-red-bg transition-colors
                  ${i % 6 !== 5 ? "border-r border-rule" : ""}
                  ${i >= 6 ? "border-t border-rule" : ""}
                `}
              >
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-red scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                <span className="text-3xl mb-2.5">{getCategoryEmoji(cat.name)}</span>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-ink group-hover:text-red transition-colors">
                  {cat.name}
                </p>
                <p className="text-[11px] text-ink-4 mt-1">{cat.count} recipes</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── RESTAURANTS ────────────────────────────────── */}
      {restaurants.length > 0 && (
        <section className="bg-bg-2 border-y border-rule py-14">
          <div className="max-w-site mx-auto px-6">
            <div className="sec-hd">
              <div>
                <p className="sec-eyebrow">By Restaurant</p>
                <h2 className="sec-title">Which Restaurant Tonight?</h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {restaurants.map((r) => (
                <Link
                  key={r.slug}
                  href={`/category/${r.slug}`}
                  className="flex items-center gap-2 border-[1.5px] border-rule bg-white px-4 py-2 text-[13px] font-bold text-ink-2 hover:border-red hover:text-red hover:bg-red-bg transition-all"
                >
                  {r.name}
                  <span className="bg-bg-3 text-ink-4 text-[10px] font-bold px-1.5 py-0.5 transition-colors">
                    {r.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── LATEST RECIPES ─────────────────────────────── */}
      {latest.length > 0 && (
        <section className="max-w-site mx-auto px-6 py-14">
          <div className="sec-hd">
            <div>
              <p className="sec-eyebrow">Fresh</p>
              <h2 className="sec-title">Latest Recipes</h2>
            </div>
            <Link href="/recipes" className="sec-link flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-rule">
            {latest.map((r, i) => (
              <div key={r.id} className={`${i < latest.length - 1 ? "border-r border-rule" : ""}`}>
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EMPTY STATE ────────────────────────────────── */}
      {recipes.length === 0 && (
        <section className="max-w-2xl mx-auto px-6 py-28 text-center">
          <p className="font-serif text-[48px] font-black text-ink-4 mb-4">🍽️</p>
          <h2 className="font-serif text-[32px] font-black text-ink mb-3">Recipes are on the way</h2>
          <p className="text-[15px] text-ink-3 leading-relaxed mb-8">
            We're building our collection. Check back soon.
          </p>
          <Link href="/about" className="btn-outline">Learn More</Link>
        </section>
      )}
    </div>
  );
}
