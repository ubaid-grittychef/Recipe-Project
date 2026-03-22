import { NextRequest, NextResponse } from "next/server";
import { getRecipesByProject, updateRecipe } from "@/lib/store";
import { injectInternalLinks } from "@/lib/generator";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Relink");

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;

  try {
    const recipes = await getRecipesByProject(id);
    const published = recipes.filter((r) => r.status === "published");

    if (published.length === 0) {
      return NextResponse.json({ updated: 0, message: "No published recipes to relink" });
    }

    let updated = 0;

    // Use ALL recipes as candidates so links can reference any recipe;
    // only update published recipes since drafts aren't live yet.
    for (const recipe of published) {
      const newIntro = injectInternalLinks(
        recipe.intro_content,
        recipes,
        recipe.slug
      );

      if (newIntro !== recipe.intro_content) {
        await updateRecipe(recipe.id, { intro_content: newIntro });
        updated++;
      }
    }

    log.info("Internal relink completed", { projectId: id, totalPublished: published.length, totalCandidates: recipes.length, updated });

    return NextResponse.json({
      updated,
      total: published.length,
      message: `Updated internal links in ${updated} of ${published.length} recipes`,
    });
  } catch (error) {
    log.error("Relink failed", { projectId: id }, error);
    return NextResponse.json({ error: "Relink failed" }, { status: 500 });
  }
}
