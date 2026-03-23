import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getRecipesByCategory, getRecipesByRestaurant } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";
import { ChefHat, ChevronRight } from "lucide-react";
import Link from "next/link";

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

  // Use first recipe image in this category as og:image
  const recipes = await getRecipesByCategory(category.name);
  const ogImage = recipes.find((r) => r.image_url)?.image_url ?? siteConfig.ogImage;

  return {
    title: `${category.name} Recipes`,
    description: `Discover ${category.count} ${category.name} recipes. Copycat recipes, cooking tips, and more.`,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: `${category.name} Recipes | ${siteConfig.name}`,
      description: `Discover ${category.count} ${category.name} recipes.`,
      url: `${siteConfig.url}/category/${slug}`,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: `${category.name} Recipes` }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: `${siteConfig.url}/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const categories = await getCategories();

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  // Prefer category-field based lookup; fall back to restaurant_name for older recipes
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/<\//g, "<\\/") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/<\//g, "<\\/") }} />
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Home</Link>
        <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
        <Link href="/categories" className="hover:text-slate-600 dark:hover:text-slate-300">Categories</Link>
        <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
        <span className="text-slate-600 dark:text-slate-400" aria-current="page">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white"
        >
          <ChefHat className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {category.name} Recipes
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in this
          category
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
            We don&apos;t have any {category.name} recipes yet. Check back soon
            or browse our other categories.
          </p>
          <Link
            href="/categories"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Browse all categories
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
