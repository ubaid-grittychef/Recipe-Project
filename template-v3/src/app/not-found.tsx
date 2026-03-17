import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { ArrowRight, Search } from "lucide-react";

export default async function NotFound() {
  let recentRecipes: { slug: string; title: string; category: string | null }[] = [];
  try {
    const all = await getAllRecipes();
    recentRecipes = all.slice(0, 4).map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
    }));
  } catch {
    // Silently ignore — Supabase might not be configured in preview builds
  }

  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-[640px] mx-auto px-6 py-24 text-center">

        {/* 404 */}
        <p className="font-serif text-[96px] font-black text-ink-4 leading-none tracking-[-4px]">
          404
        </p>
        <div className="h-[3px] bg-ink w-16 mx-auto my-6" />

        <h1 className="font-serif text-[28px] font-black text-ink tracking-[-0.5px] mb-3">
          Recipe Not Found
        </h1>
        <p className="text-[14px] text-ink-3 leading-[1.75] mb-10 max-w-[400px] mx-auto">
          This recipe seems to have wandered off the menu. It may have been moved, renamed, or removed.
        </p>

        {/* Quick nav */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          <Link href="/" className="btn-red flex items-center gap-2">
            Home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/recipes" className="btn-outline">All Recipes</Link>
          <Link href="/search" className="btn-outline flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> Search
          </Link>
        </div>

        {/* Recent recipes */}
        {recentRecipes.length > 0 && (
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-4">You Might Like</p>
            <div className="border border-rule divide-y divide-rule text-left">
              {recentRecipes.map((r, i) => (
                <Link
                  key={r.slug}
                  href={`/recipe/${r.slug}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-red-bg group transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-bold text-ink group-hover:text-red transition-colors">{r.title}</p>
                    {r.category && (
                      <p className="text-[11px] text-ink-4 mt-0.5 uppercase tracking-[0.5px] font-semibold">{r.category}</p>
                    )}
                  </div>
                  <span className="text-red font-bold shrink-0 ml-3">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-[12px] text-ink-4">
          &copy; {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </div>
  );
}
