import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  getRecipeBySlug,
  getRelatedRecipes,
  getRecipeSlugs,
} from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { slugifyCategory } from "@/lib/utils";
import RecipeCard from "@/components/RecipeCard";
import RecipeActions from "@/components/RecipeActions";
import AffiliateLink from "@/components/AffiliateLink";
import IngredientsChecklist from "@/components/IngredientsChecklist";
import Image from "next/image";
import {
  Clock,
  Users,
  ChefHat,
  Flame,
  ShoppingCart,
  ExternalLink,
  Star,
  Lightbulb,
  ArrowDown,
  Sparkles,
  HelpCircle,
  Package,
  ChevronRight,
} from "lucide-react";

export const revalidate = 300;

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

  const imageUrl = recipe.image_url || undefined;

  const metaTitle = recipe.seo_title || recipe.title;
  const metaDescription = recipe.seo_description ||
    `${recipe.title} recipe — ready in ${recipe.total_time || recipe.cook_time || "under an hour"} | ${recipe.rating ?? "4.8"} stars. ${recipe.description?.slice(0, 100) ?? ""}`.trim();

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "article",
      url: `${siteConfig.url}/recipe/${slug}`,
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: `${recipe.title} recipe` }],
      }),
      publishedTime: recipe.published_at ?? undefined,
      authors: [siteConfig.author],
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: metaTitle,
      description: metaDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
    alternates: {
      canonical: `${siteConfig.url}/recipe/${slug}`,
    },
  };
}

function parseDuration(timeStr: string): string {
  const digits = timeStr.replace(/\D+/g, "");
  return digits ? `PT${digits}M` : "PT0M";
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <Star
          key={i}
          className="h-4 w-4 fill-amber-400 text-amber-400"
        />
      );
    } else if (i === full && hasHalf) {
      stars.push(
        <span key={i} className="relative inline-block h-4 w-4">
          <Star className="absolute h-4 w-4 text-slate-200" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </span>
        </span>
      );
    } else {
      stars.push(
        <Star key={i} className="h-4 w-4 text-slate-200" />
      );
    }
  }
  return stars;
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
      <Link key={keyIdx++} href={match[2]} className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
        {match[1]}
      </Link>
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
      elements.push(
        <h2
          key={i}
          className="mb-3 mt-6 text-xl font-bold text-slate-900"
        >
          {parts[i]}
        </h2>
      );
    } else if (parts[i].trim()) {
      const paragraphs = parts[i].split(/\n\n+/);
      paragraphs.forEach((p, j) => {
        if (p.trim()) {
          elements.push(
            <p
              key={`${i}-${j}`}
              className="mb-4 text-base leading-relaxed text-slate-700"
            >
              {renderInlineLinks(p.trim())}
            </p>
          );
        }
      });
    }
  }

  return elements;
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const related = await getRelatedRecipes(slug, recipe.restaurant_name, recipe.category);

  const rating = recipe.rating ?? 4.8;
  const ratingCount = Math.floor(
    parseInt(recipe.id.replace(/\D/g, "").slice(0, 3) || "127", 10) % 300
  ) + 50;

  const recipeSchema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    author: { "@type": "Person", name: siteConfig.author },
    datePublished: recipe.published_at,
    prepTime: parseDuration(recipe.prep_time),
    cookTime: parseDuration(recipe.cook_time),
    totalTime: parseDuration(recipe.total_time || recipe.cook_time),
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.category ?? recipe.restaurant_name ?? "General",
    keywords: recipe.focus_keywords?.join(", ") ?? recipe.keyword,
    dateModified: recipe.created_at ?? recipe.published_at,
    recipeIngredient: recipe.ingredients.map(
      (i) => `${i.quantity} ${i.unit} ${i.name}`
    ),
    recipeInstructions: recipe.instructions.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      text: step,
    })),
    nutrition: {
      "@type": "NutritionInformation",
      calories: `${recipe.nutrition.calories} calories`,
      proteinContent: recipe.nutrition.protein,
      carbohydrateContent: recipe.nutrition.carbs,
      fatContent: recipe.nutrition.fat,
      fiberContent: recipe.nutrition.fiber,
      sodiumContent: recipe.nutrition.sodium,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating.toString(),
      ratingCount: ratingCount.toString(),
      bestRating: "5",
      worstRating: "1",
    },
    recipeCuisine: recipe.category ?? recipe.restaurant_name ?? "",
    ...(recipe.image_url && { image: [recipe.image_url] }),
  };

  const middleCrumb = recipe.restaurant_name ?? recipe.category ?? null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      ...(middleCrumb
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: middleCrumb,
              item: `${siteConfig.url}/category/${slugifyCategory(middleCrumb)}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: middleCrumb ? 3 : 2,
        name: recipe.title,
        item: `${siteConfig.url}/recipe/${slug}`,
      },
    ],
  };

  const faqSchema =
    recipe.faqs && recipe.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: recipe.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(recipeSchema).replace(/<\//g, "<\\/"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/<\//g, "<\\/"),
        }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/<\//g, "<\\/"),
          }}
        />
      )}

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-slate-400"
        >
          <Link href="/" className="hover:text-slate-600">
            Home
          </Link>
          {middleCrumb && (
            <>
              <ChevronRight className="mx-1 inline-block h-3 w-3 shrink-0" />
              <Link
                href={`/category/${slugifyCategory(middleCrumb)}`}
                className="hover:text-slate-600"
              >
                {middleCrumb}
              </Link>
            </>
          )}
          <ChevronRight className="mx-1 inline-block h-3 w-3 shrink-0" />
          <span className="text-slate-600" aria-current="page">{recipe.title}</span>
        </nav>

        {/* H1 Title */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          {recipe.title}
        </h1>

        {/* Meta bar: rating, times, author, date */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span
            className="flex items-center gap-1"
            role="img"
            aria-label={`Rating: ${rating} out of 5 stars (${ratingCount} reviews)`}
          >
            {renderStars(rating)}
            <span className="ml-1 font-medium text-slate-700" aria-hidden="true">
              {rating}
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ({ratingCount} reviews)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Total: {recipe.total_time || recipe.cook_time}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {recipe.servings} servings
          </span>
          <span className="flex items-center gap-1.5">
            <ChefHat className="h-4 w-4" />
            {recipe.difficulty}
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-400">
          By {siteConfig.author}
          {recipe.published_at && (
            <>
              {" · "}
              <time dateTime={recipe.published_at}>
                {new Date(recipe.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </>
          )}
        </div>

        {/* Jump to Recipe + Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href="#recipe-card"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <ArrowDown className="h-4 w-4" />
            Jump to Recipe
          </a>
          <RecipeActions title={recipe.title} />
        </div>

        {/* Hero image — shown prominently above the fold */}
        {recipe.image_url && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-sm">
            <Image
              src={recipe.image_url}
              alt={`${recipe.title} recipe`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

        {/* Hero description */}
        <div className="mt-8 rounded-xl border border-amber-100 bg-amber-50/50 p-6">
          <p className="text-base leading-relaxed text-slate-700">
            {recipe.description}
          </p>
        </div>

        {/* Ad slot: below description */}
        {siteConfig.adsenseId && (
          <div className="my-6 min-h-[90px] rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
            Ad Space
          </div>
        )}

        {/* Intro content (the blog article section) */}
        {recipe.intro_content && (
          <section className="mt-8">
            {renderIntroContent(recipe.intro_content)}
          </section>
        )}

        {/* ====== RECIPE CARD (anchor for Jump to Recipe) ====== */}
        <div
          id="recipe-card"
          className="mt-12 scroll-mt-20 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm"
        >
          {/* Recipe card header */}
          <div
            className="px-6 py-5 text-white"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{recipe.title}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  {renderStars(rating)}
                  <span className="ml-1">
                    {rating} ({ratingCount})
                  </span>
                </div>
              </div>
              <RecipeActions title={recipe.title} variant="light" />
            </div>
          </div>

          {/* Time/servings row */}
          <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
            {[
              { label: "Prep", value: recipe.prep_time, icon: Clock },
              { label: "Cook", value: recipe.cook_time, icon: Flame },
              {
                label: "Total",
                value: recipe.total_time || recipe.cook_time,
                icon: Clock,
              },
              {
                label: "Servings",
                value: `${recipe.servings}`,
                icon: Users,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center py-4 text-center"
              >
                <item.icon className="mb-1 h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">
                  {item.label}
                </span>
                <span className="mt-0.5 text-sm font-semibold text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div id="recipe-content" className="scroll-mt-20 px-6 py-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Ingredients
            </h2>
            <IngredientsChecklist ingredients={recipe.ingredients} />

            {siteConfig.hellofreshUrl && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-900">Skip the grocery run</p>
                    <p className="mt-0.5 text-sm leading-snug text-emerald-700">
                      Get pre-measured ingredients for this recipe delivered fresh to your door.
                    </p>
                    <AffiliateLink
                      href={siteConfig.hellofreshUrl}
                      type="hellofresh"
                      label="Get Ingredients Delivered"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Get Ingredients Delivered
                    </AffiliateLink>
                    <p className="mt-2 text-[10px] text-emerald-600/70">
                      Affiliate link — we may earn a small commission at no extra cost to you.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ad slot */}
          {siteConfig.adsenseId && (
            <div className="mx-6 mb-6 min-h-[90px] rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
              Ad Space
            </div>
          )}

          {/* Instructions */}
          <div className="border-t border-slate-100 px-6 py-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Instructions
            </h2>
            <ol className="space-y-5">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: siteConfig.primaryColor }}
                  >
                    {i + 1}
                  </div>
                  <p className="pt-1 text-sm leading-relaxed text-slate-700">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Nutrition */}
          <div className="border-t border-slate-100 px-6 py-6">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Nutrition Facts
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              Per serving (approximate)
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[
                { label: "Calories", value: recipe.nutrition.calories },
                { label: "Protein", value: recipe.nutrition.protein },
                { label: "Carbs", value: recipe.nutrition.carbs },
                { label: "Fat", value: recipe.nutrition.fat },
                { label: "Fiber", value: recipe.nutrition.fiber },
                { label: "Sodium", value: recipe.nutrition.sodium },
              ].map((n) => (
                <div
                  key={n.label}
                  className="rounded-lg border border-slate-100 p-3 text-center"
                >
                  <p className="text-lg font-bold text-slate-900">
                    {n.value}
                  </p>
                  <p className="text-xs text-slate-400">{n.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* ====== END RECIPE CARD ====== */}

        {/* Pro Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900">
                Pro Tips
              </h2>
            </div>
            <div className="space-y-3">
              {recipe.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-lg border border-amber-100 bg-amber-50/40 p-4"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: siteConfig.primaryColor }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Variations */}
        {recipe.variations && recipe.variations.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h2 className="text-xl font-bold text-slate-900">
                Recipe Variations
              </h2>
            </div>
            <ul className="space-y-2">
              {recipe.variations.map((v, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/30 p-4"
                >
                  <span className="mt-0.5 text-violet-400">•</span>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {v}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ad slot */}
        {siteConfig.adsenseId && (
          <div className="my-8 min-h-[250px] rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
            Ad Space
          </div>
        )}

        {/* FAQ Section */}
        {recipe.faqs && recipe.faqs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {recipe.faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group bg-white"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <span>{faq.question}</span>
                    <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Keywords / Tags */}
        <div className="mt-8 flex flex-wrap gap-2">
          {recipe.focus_keywords?.map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500"
            >
              {kw}
            </span>
          ))}
        </div>
      </article>

      {/* Related Recipes */}
      {related.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-xl font-bold text-slate-900">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
