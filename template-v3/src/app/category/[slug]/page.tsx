import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategories, getRecipesByCategory, getRecipesByRestaurant } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};

  const recipes = await getRecipesByCategory(category.name);
  const ogImage = recipes.find((r) => r.image_url)?.image_url ?? siteConfig.ogImage;

  return {
    title: `${category.name} Recipes`,
    description: `Discover ${category.count} ${category.name} copycat recipes. Step-by-step instructions, easy to follow, restaurant quality at home.`,
    alternates: { canonical: `${siteConfig.url}/category/${slug}` },
    openGraph: {
      title: `${category.name} Recipes | ${siteConfig.name}`,
      description: `Discover ${category.count} ${category.name} recipes.`,
      url: `${siteConfig.url}/category/${slug}`,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: `${category.name} Recipes` }],
      }),
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  let recipes = await getRecipesByCategory(category.name);
  if (recipes.length === 0) {
    recipes = await getRecipesByRestaurant(category.name);
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Categories", item: `${siteConfig.url}/categories` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${siteConfig.url}/category/${slug}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} Recipes | ${siteConfig.name}`,
    url: `${siteConfig.url}/category/${slug}`,
    numberOfItems: recipes.length,
    itemListElement: recipes.slice(0, 20).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/recipe/${r.slug}`,
      name: r.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <div className="bg-bg min-h-screen">

        {/* ── Category header ──────────────────────────── */}
        <div className="border-b border-rule bg-white py-10">
          <div className="max-w-site mx-auto px-6">

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1px] text-ink-4 mb-6">
              <Link href="/" className="text-red hover:text-red-dark transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3 text-rule" />
              <Link href="/categories" className="text-red hover:text-red-dark transition-colors">Categories</Link>
              <ChevronRight className="h-3 w-3 text-rule" />
              <span aria-current="page" className="text-ink-3 truncate max-w-[200px]">{category.name}</span>
            </nav>

            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="sec-eyebrow mb-2">Category</p>
                <h1 className="font-serif text-[36px] sm:text-[44px] font-black text-ink tracking-[-1px] leading-[1.05]">
                  {category.name} Recipes
                </h1>
              </div>
              <p className="text-[13px] font-bold text-ink-4 uppercase tracking-[1px] shrink-0 pb-1">
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Recipe grid ──────────────────────────────── */}
        <div className="max-w-site mx-auto px-6 py-10">
          {recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-rule">
              {recipes.map((recipe, i) => {
                const col = i % 3;
                const isLastCol = col === 2;
                return (
                  <div key={recipe.id} className={`${!isLastCol ? "border-r border-rule" : ""} ${i >= 3 ? "border-t border-rule" : ""}`}>
                    <RecipeCard recipe={recipe} rank={i + 1} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-rule py-20 text-center">
              <p className="font-serif text-[24px] font-black text-ink-4 mb-2">No recipes yet</p>
              <p className="text-[14px] text-ink-4 mb-6">We don&apos;t have any {category.name} recipes yet. Check back soon.</p>
              <Link href="/categories" className="btn-outline">Browse All Categories</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
