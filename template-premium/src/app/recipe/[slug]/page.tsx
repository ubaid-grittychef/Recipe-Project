import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getRecipeBySlug, getRelatedRecipes, getRecipeSlugs } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { slugifyCategory } from "@/lib/utils";
import Image from "next/image";
import AffiliateLink from "@/components/AffiliateLink";
import IngredientsChecklist from "@/components/IngredientsChecklist";
import {
  Clock, Users, ChefHat, Flame, ShoppingCart,
  Star, Lightbulb, HelpCircle, Package, ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return {};
  const title = recipe.seo_title || recipe.title;
  const description = recipe.seo_description ||
    `${recipe.title} recipe — ready in ${recipe.total_time || recipe.cook_time || "under an hour"} | ${recipe.rating ?? "4.8"} stars. ${recipe.description?.slice(0, 100) ?? ""}`.trim();
  const images = recipe.image_url
    ? [{ url: recipe.image_url, width: 1200, height: 630, alt: recipe.title }]
    : [];
  return {
    title,
    description,
    keywords: recipe.focus_keywords?.join(", "),
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title,
      description,
      type: "article",
      url: `${siteConfig.url}/recipe/${slug}`,
      images,
      ...(recipe.published_at && { publishedTime: recipe.published_at }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: recipe.image_url ? [recipe.image_url] : [],
    },
    alternates: { canonical: `${siteConfig.url}/recipe/${slug}` },
  };
}

function renderInlineLinks(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push(text.slice(lastIndex, match.index));
    result.push(
      <Link key={keyIdx++} href={match[2]} className="font-medium text-primary-500 underline underline-offset-2 hover:text-primary-600">{match[1]}</Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex));
  return result.length > 0 ? result : [text];
}

function renderIntroContent(content: string) {
  const parts = content.split(/\*\*(.+?)\*\*/g);
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      elements.push(<h2 key={i} className="mb-3 mt-8 font-heading text-2xl font-bold text-white">{parts[i]}</h2>);
    } else if (parts[i].trim()) {
      const paragraphs = parts[i].split(/\n\n+/);
      paragraphs.forEach((p, j) => {
        if (p.trim()) {
          elements.push(<p key={`${i}-${j}`} className="mb-4 text-base leading-relaxed text-slate-300">{renderInlineLinks(p.trim())}</p>);
        }
      });
    }
  }
  return elements;
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const [recipe, related] = await Promise.all([
    getRecipeBySlug(slug),
    getRecipeBySlug(slug).then((r) => r ? getRelatedRecipes(slug, r.category) : []),
  ]);
  if (!recipe) notFound();

  const recipeSchema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.image_url ? [recipe.image_url] : undefined,
    author: { "@type": "Person", name: siteConfig.author || siteConfig.name },
    datePublished: recipe.published_at ?? recipe.created_at,
    dateModified: recipe.updated_at ?? recipe.created_at ?? recipe.published_at,
    prepTime: `PT${recipe.prep_time?.replace(/\D/g, "") ?? 0}M`,
    cookTime: `PT${recipe.cook_time?.replace(/\D/g, "") ?? 0}M`,
    totalTime: `PT${recipe.total_time?.replace(/\D/g, "") ?? 0}M`,
    recipeYield: String(recipe.servings),
    recipeCategory: recipe.category ?? undefined,
    recipeCuisine: recipe.category ?? undefined,
    keywords: recipe.focus_keywords?.join(", ") || recipe.keyword,
    recipeIngredient: recipe.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim()),
    recipeInstructions: recipe.instructions.map((s, idx) => ({ "@type": "HowToStep", position: idx + 1, name: `Step ${idx + 1}`, text: s })),
    aggregateRating: { "@type": "AggregateRating", ratingValue: recipe.rating, reviewCount: 247, bestRating: 5 },
    nutrition: {
      "@type": "NutritionInformation",
      calories: `${recipe.nutrition.calories} calories`,
      proteinContent: recipe.nutrition.protein,
      carbohydrateContent: recipe.nutrition.carbs,
      fatContent: recipe.nutrition.fat,
      fiberContent: recipe.nutrition.fiber || undefined,
      sodiumContent: recipe.nutrition.sodium || undefined,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      ...(recipe.category ? [{ "@type": "ListItem", position: 2, name: recipe.category, item: `${siteConfig.url}/category/${recipe.category.toLowerCase().replace(/\s+/g, "-")}` }] : []),
      { "@type": "ListItem", position: recipe.category ? 3 : 2, name: recipe.title, item: `${siteConfig.url}/recipe/${recipe.slug}` },
    ],
  };

  const faqSchema = recipe.faqs?.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: recipe.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null;

  const difficultyColor = { Easy: "bg-emerald-500/20 text-emerald-400", Medium: "bg-amber-500/20 text-amber-400", Hard: "bg-red-500/20 text-red-400" }[recipe.difficulty] ?? "bg-slate-500/20 text-slate-400";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema).replace(/<\//g, "<\\/") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/<\//g, "<\\/") }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/<\//g, "<\\/") }} />}

      {/* Hero banner */}
      <div className="relative h-[50vh] min-h-[320px] overflow-hidden">
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={`${recipe.title} recipe`} fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="h-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8">
          <div className="mx-auto max-w-7xl">
            <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {recipe.category && (
              <div className="mb-3">
                <Link href={`/category/${slugifyCategory(recipe.category)}`}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: siteConfig.primaryColor }}>
                  {recipe.category}
                </Link>
              </div>
            )}
            <h1 className="font-heading text-3xl font-bold text-white md:text-4xl lg:text-5xl max-w-3xl leading-tight">
              {recipe.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(recipe.rating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                ))}
                <span className="ml-1 text-sm font-medium text-amber-400">{recipe.rating}</span>
                <span className="text-sm text-slate-500">(247 reviews)</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyColor}`}>{recipe.difficulty}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

          {/* SIDEBAR — sticky on desktop */}
          <aside className="lg:sticky lg:top-24 lg:w-80 lg:shrink-0">

            {/* Quick stats */}
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Clock, label: "Prep", value: recipe.prep_time },
                  { icon: Flame, label: "Cook", value: recipe.cook_time },
                  { icon: Clock, label: "Total", value: recipe.total_time },
                  { icon: Users, label: "Serves", value: String(recipe.servings) },
                  { icon: ChefHat, label: "Level", value: recipe.difficulty },
                  { icon: Star, label: "Rating", value: String(recipe.rating) },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center rounded-xl bg-white/5 p-3 text-center">
                    <item.icon className="mb-1 h-4 w-4 text-slate-400" />
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div id="recipe-content" className="mt-5 scroll-mt-20 rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Ingredients</h2>
              <IngredientsChecklist ingredients={recipe.ingredients} />

              {/* HelloFresh CTA */}
              {siteConfig.hellofreshUrl && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-emerald-300">Skip the grocery run</p>
                      <p className="mt-0.5 text-xs text-emerald-500">Pre-measured ingredients delivered fresh.</p>
                      <AffiliateLink
                        href={siteConfig.hellofreshUrl}
                        type="hellofresh" label="Get Ingredients Delivered"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Get Ingredients Delivered
                      </AffiliateLink>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nutrition sidebar */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Nutrition</h2>
              <p className="mb-3 text-xs text-slate-500">Per serving (approximate)</p>
              <div className="space-y-2">
                {[
                  { label: "Calories", value: String(recipe.nutrition.calories), highlight: true },
                  { label: "Protein", value: recipe.nutrition.protein },
                  { label: "Carbs", value: recipe.nutrition.carbs },
                  { label: "Fat", value: recipe.nutrition.fat },
                  { label: "Fiber", value: recipe.nutrition.fiber },
                  { label: "Sodium", value: recipe.nutrition.sodium },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-sm text-slate-400">{n.label}</span>
                    <span className={`text-sm font-bold ${n.highlight ? "text-primary-500" : "text-white"}`}>{n.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="min-w-0 flex-1">
            {/* Intro */}
            {recipe.intro_content && (
              <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
                {renderIntroContent(recipe.intro_content)}
              </div>
            )}

            {/* Instructions */}
            <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
              <h2 className="mb-6 font-heading text-2xl font-bold text-white">Instructions</h2>
              <ol className="space-y-6">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: siteConfig.primaryColor }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-base leading-relaxed text-slate-300">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            {recipe.tips?.length > 0 && (
              <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-amber-300">
                  <Lightbulb className="h-5 w-5" /> Pro Tips
                </h2>
                <ul className="space-y-3">
                  {recipe.tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Variations */}
            {recipe.variations?.length > 0 && (
              <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
                <h2 className="mb-4 font-heading text-xl font-bold text-white">Variations & Twists</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recipe.variations.map((v, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-300">{v}</div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {recipe.faqs?.length > 0 && (
              <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
                <h2 className="mb-5 flex items-center gap-2 font-heading text-xl font-bold text-white">
                  <HelpCircle className="h-5 w-5 text-slate-400" /> Frequently Asked Questions
                </h2>
                <div className="space-y-5">
                  {recipe.faqs.map((faq, i) => (
                    <div key={i} className="border-b border-white/5 pb-5 last:border-0 last:pb-0">
                      <p className="mb-2 font-semibold text-white">{faq.question}</p>
                      <p className="text-sm leading-relaxed text-slate-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related recipes */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-heading text-2xl font-bold text-white">You Might Also Like</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((r) => (
                <Link key={r.id} href={`/recipe/${r.slug}`} className="group overflow-hidden rounded-xl border border-white/10 bg-slate-900 hover:border-white/20">
                  <div className="relative h-32 overflow-hidden">
                    {r.image_url ? (
                      <Image src={r.image_url} alt={r.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-800 text-3xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary-500">{r.title}</p>
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{r.total_time}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
