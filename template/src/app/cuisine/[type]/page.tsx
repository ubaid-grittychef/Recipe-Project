import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCuisines, getRecipesByCuisine } from "@/lib/taxonomies";
import RecipeCard from "@/components/RecipeCard";
import { ChefHat, ChevronRight } from "lucide-react";

export const revalidate = 300;

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  const recipes = await getAllRecipes();
  const cuisines = getCuisines(recipes);
  return cuisines.map((c) => ({ type: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const recipes = await getAllRecipes();
  const cuisines = getCuisines(recipes);
  const cuisine = cuisines.find((c) => c.slug === type);
  if (!cuisine) return {};

  const filtered = getRecipesByCuisine(recipes, cuisine.name);
  const ogImage = filtered.find((r) => r.image_url)?.image_url ?? siteConfig.ogImage;

  return {
    title: `${cuisine.name} Recipes | ${siteConfig.name}`,
    description: `Discover ${filtered.length} ${cuisine.name} recipes. Authentic flavors, cooking tips, and more.`,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: `${cuisine.name} Recipes | ${siteConfig.name}`,
      description: `Discover ${filtered.length} ${cuisine.name} recipes.`,
      url: `${siteConfig.url}/cuisine/${type}`,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: `${cuisine.name} Recipes` }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: `${siteConfig.url}/cuisine/${type}`,
    },
  };
}

export default async function CuisineDetailPage({ params }: Props) {
  const { type } = await params;
  const allRecipes = await getAllRecipes();
  const cuisines = getCuisines(allRecipes);

  const cuisine = cuisines.find((c) => c.slug === type);
  if (!cuisine) notFound();

  const recipes = getRecipesByCuisine(allRecipes, cuisine.name);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Cuisines", item: `${siteConfig.url}/cuisines` },
      { "@type": "ListItem", position: 3, name: cuisine.name, item: `${siteConfig.url}/cuisine/${type}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cuisine.name} Recipes | ${siteConfig.name}`,
    url: `${siteConfig.url}/cuisine/${type}`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/<\//g, "<\\/") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/<\//g, "<\\/") }} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Home</Link>
          <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
          <Link href="/cuisines" className="hover:text-slate-600 dark:hover:text-slate-300">Cuisines</Link>
          <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
          <span className="text-slate-600 dark:text-slate-400" aria-current="page">{cuisine.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <span className="text-5xl">{cuisine.emoji}</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {cuisine.name} Recipes
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in this cuisine
          </p>
        </div>

        {/* Recipe grid */}
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-20 text-center">
            <ChefHat className="mx-auto h-16 w-16 text-slate-200 dark:text-slate-700" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
              No recipes found
            </h2>
            <p className="mt-2 max-w-md mx-auto text-slate-500 dark:text-slate-400">
              We don&apos;t have any {cuisine.name} recipes yet. Check back soon
              or browse our other cuisines.
            </p>
            <Link
              href="/cuisines"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Browse all cuisines
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
