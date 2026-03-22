import { NextRequest, NextResponse } from "next/server";
import { getRecipe, updateRecipe } from "@/lib/store";
import { refreshRecipeContent } from "@/lib/openai";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:RecipeRefresh");

interface Props {
  params: Promise<{ id: string; recipeId: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { id, recipeId } = await params;

  try {
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;
    const { project } = auth;

    const recipe = await getRecipe(recipeId);
    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    if (recipe.project_id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    log.info("Refreshing recipe content", { recipeId, keyword: recipe.keyword });

    const refreshed = await refreshRecipeContent(
      recipe.keyword,
      recipe.title,
      project.niche,
      project.content_tone,
      recipe.restaurant_name
    );

    const updated = await updateRecipe(recipeId, {
      intro_content: refreshed.intro_content,
      seo_title: refreshed.seo_title,
      seo_description: refreshed.seo_description,
      focus_keywords: refreshed.focus_keywords,
    });

    log.info("Recipe content refreshed", { recipeId, keyword: recipe.keyword });

    return NextResponse.json({ recipe: updated });
  } catch (error) {
    log.error("Recipe refresh failed", { recipeId }, error);
    return NextResponse.json({ error: "Refresh failed — check OpenAI configuration" }, { status: 500 });
  }
}
