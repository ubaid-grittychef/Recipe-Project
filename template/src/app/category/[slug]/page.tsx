import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getRecipesByCategory, getRecipesByRestaurant } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";
import { ChefHat } from "lucide-react";
import Link from "next/link";

export const revalidate = 3600;

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

  return {
    title: `${category.name} Recipes`,
    description: `Discover ${category.count} ${category.name} recipes. Copycat recipes, cooking tips, and more.`,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: `${category.name} Recipes | ${siteConfig.name}`,
      description: `Discover ${category.count} ${category.name} recipes.`,
      url: `${siteConfig.url}/category/${slug}`,
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/categories" className="hover:text-slate-600">
          Categories
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          <ChefHat className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {category.name} Recipes
        </h1>
        <p className="mt-2 text-slate-600">
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
        <div className="rounded-2xl border border-slate-100 bg-slate-50 py-20 text-center">
          <ChefHat className="mx-auto h-16 w-16 text-slate-200" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            No recipes found
          </h2>
          <p className="mt-2 max-w-md mx-auto text-slate-500">
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
  );
}
