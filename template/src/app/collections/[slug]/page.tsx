import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { COLLECTIONS, getCollection } from "@/lib/collections";
import RecipeCard from "@/components/RecipeCard";
import { ChefHat, ChevronRight } from "lucide-react";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return {};

  return {
    title: `${collection.name} | ${siteConfig.name}`,
    description: collection.description,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: `${collection.name} | ${siteConfig.name}`,
      description: collection.description,
      url: `${siteConfig.url}/collections/${slug}`,
    },
    alternates: {
      canonical: `${siteConfig.url}/collections/${slug}`,
    },
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const allRecipes = await getAllRecipes();
  const recipes = collection.filter(allRecipes);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${siteConfig.url}/collections` },
      { "@type": "ListItem", position: 3, name: collection.name, item: `${siteConfig.url}/collections/${slug}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${collection.name} | ${siteConfig.name}`,
    url: `${siteConfig.url}/collections/${slug}`,
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
          <Link href="/collections" className="hover:text-slate-600 dark:hover:text-slate-300">Collections</Link>
          <ChevronRight className="mx-1 h-3 w-3 shrink-0" />
          <span className="text-slate-600 dark:text-slate-400" aria-current="page">{collection.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <span className="text-5xl">{collection.emoji}</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            {collection.name}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{collection.description}</p>
          <p className="mt-1 text-sm text-slate-500">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
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
              No recipes match this collection yet. Check back soon
              or browse our other collections.
            </p>
            <Link
              href="/collections"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Browse all collections
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
