import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { getAllPosts } from "@/lib/blog-data";
import { BookOpen, Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: `Blog - Cooking Tips & Guides | ${siteConfig.name}`,
  description: `Cooking tips, kitchen guides, and food knowledge from ${siteConfig.name}. Level up your home cooking with expert advice.`,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: `Blog - Cooking Tips & Guides | ${siteConfig.name}`,
    description: `Cooking tips, kitchen guides, and food knowledge from ${siteConfig.name}.`,
    url: `${siteConfig.url}/blog`,
  },
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
};

// Category colors for the gradient placeholders
const categoryGradients: Record<string, string> = {
  "Kitchen Essentials": "from-amber-400 to-orange-500",
  "Techniques": "from-emerald-400 to-teal-500",
  "Food Safety": "from-rose-400 to-red-500",
  "Tips & Tricks": "from-violet-400 to-purple-500",
};

function getGradient(category: string): string {
  return categoryGradients[category] ?? "from-slate-400 to-slate-500";
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-200 dark:bg-orange-900 opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-amber-200 dark:bg-amber-900 opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div
            className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            Cooking Tips & Guides
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Practical advice, essential techniques, and kitchen wisdom to help you cook with confidence.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Image placeholder */}
              <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${getGradient(post.category)}`}>
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.read_time}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
