import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getRecipeBySlug, getRecipeSlugs, getRelatedRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { slugifyCategory } from "@/lib/utils";
import IngredientsChecklist from "@/components/IngredientsChecklist";
import RecipeActions from "@/components/RecipeActions";
import RecipeCard from "@/components/RecipeCard";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return {};

  const description =
    `${recipe.title} recipe — ready in ${recipe.total_time ?? "under an hour"}` +
    (recipe.rating ? ` | ★ ${recipe.rating.toFixed(1)} stars` : "") +
    `. ${recipe.description?.slice(0, 100) ?? ""}`;

  return {
    title: recipe.seo_title || recipe.title,
    description: recipe.seo_description || description,
    alternates: { canonical: `${siteConfig.url}/recipe/${slug}` },
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      ...(recipe.image_url && {
        images: [{ url: recipe.image_url, width: 1200, height: 800, alt: `${recipe.title} recipe` }],
      }),
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const related = await getRelatedRecipes(slug, recipe.restaurant_name ?? null, recipe.category ?? null);

  const diffClass = (d?: string) => {
    if (!d) return "text-ink-3";
    if (d.toLowerCase() === "easy") return "text-green-600";
    if (d.toLowerCase() === "hard") return "text-red";
    return "text-amber-600";
  };

  // Converts "30 mins", "1 hour", "1h 20m", "45 minutes" → "PT30M", "PT1H", "PT1H20M"
  // Returns undefined if the string cannot be parsed (better to omit than emit invalid schema.org)
  function parseTimeToISO(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().replace(/\s+/g, " ").trim();
    // Match patterns like "1 hour 30 mins", "1h30m", "90 minutes", "30 min"
    const full = s.match(/^(?:(\d+)\s*h(?:ours?|r)?)?[\s,]*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/);
    if (!full || (!full[1] && !full[2])) return undefined;
    const h = parseInt(full[1] ?? "0", 10);
    const m = parseInt(full[2] ?? "0", 10);
    if (h === 0 && m === 0) return undefined;
    if (h > 0 && m > 0) return `PT${h}H${m}M`;
    if (h > 0) return `PT${h}H`;
    return `PT${m}M`;
  }

  const recipeSchema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    author: { "@type": "Organization", name: siteConfig.name },
    image: recipe.image_url ? [recipe.image_url] : undefined,
    datePublished: recipe.published_at ?? recipe.created_at,
    dateModified: recipe.created_at,
    keywords: recipe.keyword ?? recipe.title,
    prepTime: parseTimeToISO(recipe.prep_time),
    cookTime: parseTimeToISO(recipe.cook_time),
    totalTime: parseTimeToISO(recipe.total_time),
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    recipeCuisine: recipe.category ?? undefined,
    recipeCategory: recipe.category ?? undefined,
    recipeIngredient: recipe.ingredients?.map((i) => `${i.quantity ?? ""} ${i.unit ?? ""} ${i.name}`.trim()),
    recipeInstructions: recipe.instructions?.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
    aggregateRating: recipe.rating && recipe.rating > 0
      ? { "@type": "AggregateRating", ratingValue: recipe.rating, bestRating: 5, ratingCount: 1 }
      : undefined,
    nutrition: recipe.nutrition
      ? {
          "@type": "NutritionInformation",
          calories: recipe.nutrition.calories ? `${recipe.nutrition.calories} calories` : undefined,
          proteinContent: recipe.nutrition.protein,
          carbohydrateContent: recipe.nutrition.carbs,
          fatContent: recipe.nutrition.fat,
        }
      : undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      ...(recipe.restaurant_name
        ? [{ "@type": "ListItem", position: 2, name: recipe.restaurant_name, item: `${siteConfig.url}/category/${slugifyCategory(recipe.restaurant_name)}` }]
        : []),
      { "@type": "ListItem", position: recipe.restaurant_name ? 3 : 2, name: recipe.title, item: `${siteConfig.url}/recipe/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="bg-bg">

        {/* ── RECIPE HERO ──────────────────────────────── */}
        <div className="border-b border-rule bg-white py-10">
          <div className="max-w-site mx-auto px-6">

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1px] text-ink-4 mb-6">
              <Link href="/" className="text-red hover:text-red-dark transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3 text-rule" />
              {recipe.restaurant_name && (
                <>
                  <Link href={`/category/${slugifyCategory(recipe.restaurant_name)}`} className="text-red hover:text-red-dark transition-colors">
                    {recipe.restaurant_name}
                  </Link>
                  <ChevronRight className="h-3 w-3 text-rule" />
                </>
              )}
              <span aria-current="page" className="text-ink-3 truncate max-w-[200px]">{recipe.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-10 lg:gap-14 items-start">
              <div>
                {recipe.restaurant_name && (
                  <p className="sec-eyebrow mb-3">{recipe.restaurant_name} Copycat</p>
                )}
                <h1 className="font-serif text-[40px] sm:text-[48px] font-black text-ink leading-[1.05] tracking-[-1.5px] mb-4">
                  {recipe.title}
                </h1>

                {/* Rating */}
                {recipe.rating != null && recipe.rating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-500 text-[18px] tracking-[1px]">
                      {"★".repeat(Math.round(recipe.rating))}{"☆".repeat(5 - Math.round(recipe.rating))}
                    </span>
                    <span className="text-[14px] font-extrabold text-ink">{recipe.rating.toFixed(1)}</span>
                  </div>
                )}

                {recipe.description && (
                  <p className="text-[15px] text-ink-3 leading-[1.75] mb-6 pb-6 border-b border-rule-light max-w-[520px]">
                    {recipe.description}
                  </p>
                )}

                {/* Meta bar */}
                <div className="grid grid-cols-4 border border-rule mb-6">
                  {[
                    { label: "Prep", value: recipe.prep_time },
                    { label: "Cook", value: recipe.cook_time },
                    { label: "Serves", value: recipe.servings ? `${recipe.servings}` : null },
                    { label: "Difficulty", value: recipe.difficulty, className: diffClass(recipe.difficulty) },
                  ].map((item, i) => (
                    item.value ? (
                      <div key={item.label} className={`px-4 py-3.5 ${i < 3 ? "border-r border-rule" : ""}`}>
                        <div className="text-[9px] font-extrabold uppercase tracking-[1.5px] text-ink-4 mb-1">{item.label}</div>
                        <div className={`text-[17px] font-extrabold ${item.className ?? "text-ink"}`}>
                          {item.value}
                          {(item.label === "Prep" || item.label === "Cook") && (
                            <span className="text-[11px] font-semibold text-ink-4 ml-1">min</span>
                          )}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>

                <RecipeActions title={recipe.title} />
              </div>

              {/* Recipe image */}
              {recipe.image_url && (
                <div className="relative aspect-[4/3] overflow-hidden bg-bg-2">
                  <Image
                    src={recipe.image_url}
                    alt={`${recipe.title} recipe`}
                    fill
                    priority
                    sizes="(max-width:1024px) 100vw, 460px"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RECIPE BODY ──────────────────────────────── */}
        <div className="max-w-site mx-auto px-6 py-12 recipe-body grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16">

          {/* Sidebar: Ingredients + Nutrition */}
          <aside>
            <h2 className="font-serif text-[20px] font-black text-ink tracking-[-0.3px] pb-3 mb-5 border-b-2 border-ink">
              Ingredients
            </h2>
            {recipe.ingredients?.length ? (
              <IngredientsChecklist ingredients={recipe.ingredients} />
            ) : null}

            {/* Nutrition */}
            {recipe.nutrition && (
              <div className="mt-10">
                <h2 className="font-serif text-[20px] font-black text-ink tracking-[-0.3px] pb-3 mb-5 border-b-2 border-ink">
                  Nutrition
                  <span className="text-[12px] font-sans font-semibold text-ink-4 ml-2">per serving</span>
                </h2>
                <div className="grid grid-cols-4 border border-rule">
                  {[
                    { label: "Calories", value: recipe.nutrition.calories, unit: "kcal" },
                    { label: "Protein", value: recipe.nutrition.protein, unit: "g" },
                    { label: "Carbs", value: recipe.nutrition.carbs, unit: "g" },
                    { label: "Fat", value: recipe.nutrition.fat, unit: "g" },
                  ].filter((n) => n.value).map((n, i) => (
                    <div key={n.label} className={`py-4 px-2 text-center ${i < 3 ? "border-r border-rule" : ""}`}>
                      <div className="font-serif text-[22px] font-black text-ink leading-none">{n.value}</div>
                      <div className="text-[10px] text-ink-4 font-semibold mt-0.5">{n.unit}</div>
                      <div className="text-[9px] font-extrabold uppercase tracking-[1px] text-ink-4 mt-1.5">{n.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main: Instructions + Tips + Variations + FAQ */}
          <div>
            {/* Instructions */}
            {recipe.instructions?.length ? (
              <>
                <h2 className="font-serif text-[20px] font-black text-ink tracking-[-0.3px] pb-3 mb-8 border-b-2 border-ink">
                  Instructions
                </h2>
                <ol className="space-y-7">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-5">
                      <span className="font-serif text-[28px] font-black text-red leading-[1.1] shrink-0 min-w-[32px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[15px] text-ink-2 leading-[1.8] pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            {/* Tips */}
            {recipe.tips?.length ? (
              <div className="mt-10 border border-rule border-l-[4px] border-l-red bg-red-bg p-6">
                <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-red mb-4">Pro Tips</div>
                <ul className="space-y-2.5">
                  {recipe.tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-ink-2 leading-[1.65]">
                      <span className="text-red font-bold shrink-0">—</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Variations */}
            {recipe.variations?.length ? (
              <div className="mt-10">
                <h2 className="font-serif text-[20px] font-black text-ink tracking-[-0.3px] pb-3 mb-5 border-b-2 border-ink">
                  Variations
                </h2>
                <div className="border border-rule divide-y divide-rule">
                  {recipe.variations.map((v, i) => (
                    <div key={i} className="flex gap-0">
                      <div className="font-serif text-[22px] font-black text-red px-4 py-4 border-r border-rule shrink-0 min-w-[52px] flex items-start">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <p className="px-4 py-4 text-[14px] text-ink-2 leading-[1.65]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* FAQ */}
            {recipe.faqs?.length ? (
              <div className="mt-10">
                <h2 className="font-serif text-[20px] font-black text-ink tracking-[-0.3px] pb-3 mb-5 border-b-2 border-ink">
                  FAQ
                </h2>
                <div className="divide-y divide-rule-light">
                  {recipe.faqs.map((faq, i) => (
                    <details key={i} className="group py-4">
                      <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                        <span className="text-[14px] font-bold text-ink leading-snug">{faq.question}</span>
                        <span className="text-red text-[20px] font-light shrink-0 group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <p className="mt-3 text-[14px] text-ink-3 leading-[1.75]">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Intro content */}
            {recipe.intro_content && (
              <div className="mt-10 pt-10 border-t border-rule prose prose-sm max-w-none">
                <p className="text-[15px] text-ink-2 leading-[1.85]">{recipe.intro_content}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RELATED RECIPES ──────────────────────────── */}
        {related.length > 0 && (
          <section className="border-t border-rule bg-bg-2 py-12">
            <div className="max-w-site mx-auto px-6">
              <div className="sec-hd">
                <div>
                  <p className="sec-eyebrow">More Like This</p>
                  <h2 className="sec-title">You Might Also Like</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 border border-rule">
                {related.map((r, i) => (
                  <div key={r.id} className={`${i < related.length - 1 ? "border-r border-rule" : ""}`}>
                    <RecipeCard recipe={r} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
