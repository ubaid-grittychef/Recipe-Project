import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";

export const revalidate = 3600;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const allRecipes = await getAllRecipes();
  const recipes = allRecipes.slice(0, 50);

  const items = recipes
    .map((recipe) => {
      const link = `${siteConfig.url}/recipe/${recipe.slug}`;
      const pubDate = recipe.published_at
        ? new Date(recipe.published_at).toUTCString()
        : new Date().toUTCString();
      const category = recipe.category || recipe.restaurant_name || "";

      let enclosure = "";
      if (recipe.image_url) {
        enclosure = `<enclosure url="${escapeXml(recipe.image_url)}" type="image/jpeg" length="0"/>`;
      }

      return `    <item>
      <title>${escapeXml(recipe.title)}</title>
      <description>${escapeXml(recipe.description)}</description>
      <link>${escapeXml(link)}</link>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${enclosure}
      ${category ? `<category>${escapeXml(category)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <description>${escapeXml(siteConfig.description)}</description>
    <link>${escapeXml(siteConfig.url)}</link>
    <atom:link href="${escapeXml(siteConfig.url)}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
