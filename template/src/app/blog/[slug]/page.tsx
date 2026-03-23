import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/config";
import { getPostBySlug, getAllPosts } from "@/lib/blog-data";
import { Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | ${siteConfig.name}`,
    description: post.excerpt,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${siteConfig.url}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.published_at,
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${post.slug}`,
    },
  };
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

// Category colors for badge
const categoryColors: Record<string, string> = {
  "Kitchen Essentials": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  "Techniques": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  "Food Safety": "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  "Tips & Tricks": "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

function getBadgeColor(category: string): string {
  return categoryColors[category] ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Related posts: other posts excluding current, up to 3
  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] sm:max-w-none">
            {post.title}
          </span>
        </nav>

        {/* Category badge */}
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getBadgeColor(post.category)}`}
        >
          {post.category}
        </span>

        {/* Title */}
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(post.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.read_time}
          </span>
        </div>

        {/* Divider */}
        <hr className="my-8 border-slate-200 dark:border-slate-800" />

        {/* Article content */}
        <div
          className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-p:leading-relaxed prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Back to blog */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all articles
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              More articles you might enjoy
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBadgeColor(r.category)}`}
                  >
                    {r.category}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.read_time}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
