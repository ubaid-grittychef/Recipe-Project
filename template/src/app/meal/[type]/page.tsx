import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getMealTypes, getRecipesByMealType } from "@/lib/taxonomies";
import RecipeCard from "@/components/RecipeCard";
import { ChefHat, ChevronRight } from "lucide-react";

export const revalidate = 300;

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  const recipes = await getAllRecipes();
  const mealTypes = getMealTypes(recipes);
  return mealTypes.map((m) => ({ type: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const recipes = await getAllRecipes();
  const mealTypes = getMealTypes(recipes);
  const mealType = mealTypes.find((m) => m.slug === type);
  if (!mealType) return {};

  const filtered = getRecipesByMealType(recipes, mealType.name);
  const ogImage = filtered.find((r) => r.image_url)?.image_url ?? siteConfig.ogImage;

  return {
    title: `${mealType.name} Recipes | ${siteConfig.name}`,
    description: `Discover ${filtered.length} ${mealType.name} recipes. Easy-to-follow recipes, cooking tips, and more.`,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: `${mealType.name} Recipes | ${siteConfig.name}`,
      description: `Discover ${filtered.length} ${mealType.name} recipes.`,
      url: `${siteConfig.url}/meal/${type}`,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: `${mealType.name} Recipes` }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: `${siteConfig.url}/meal/${type}`,
    },
  };
}

export default async function MealDetailPage({ params }: Props) {
  const { type } = await params;
  const allRecipes = await getAllRecipes();
  const mealTypes = getMealTypes(allRecipes);

  const mealType = mealTypes.find((m) => m.slug === type);
  if (!mealType) notFound();

  const recipes = getRecipesByMealType(allRecipes, mealType.name);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Meal Types", item: `${siteConfig.url}/meals` },
      { "@type": "ListItem", position: 3, name: mealType.name, item: `${siteConfig.url}/meal/${type}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${mealType.name} Recipes | ${siteConfig.name}`,
    url: `${siteConfig.url}/meal/${type}`,
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
          <Link href="/meals" className="hover:text-slate-600 dark:hover:text-slate-300">Meal Types</Link>
          <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
          <span className="text-slate-600 dark:text-slate-400" aria-current="page">{mealType.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <span className="text-5xl">{mealType.emoji}</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {mealType.name} Recipes
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in this meal type
          </p>
        </div>

        {/* Recipe grid */}
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="py-28 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-warm-border-dark p-6">
              <ChefHat className="h-10 w-10 text-warm-muted" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              No recipes found
            </h2>
            <p className="mt-2 max-w-md mx-auto text-slate-500 dark:text-slate-400">
              We don&apos;t have any {mealType.name} recipes yet. Check back soon
              or browse our other meal types.
            </p>
            <Link
              href="/meals"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Browse all meal types
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
