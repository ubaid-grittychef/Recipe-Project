import { NextRequest, NextResponse } from "next/server";
import { getProject, getRecipesByProject, updateRecipe } from "@/lib/store";
import { refreshRecipeContent } from "@/lib/openai";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("API:RefreshAll");

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;

  try {
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const rawBody = await req.json().catch(() => ({}));
    const bodyParsed = z.object({
      status: z.enum(["draft", "published"]).optional(),
    }).safeParse(rawBody);
    if (!bodyParsed.success) {
      return NextResponse.json({ error: "Invalid status — must be 'draft' or 'published'" }, { status: 400 });
    }
    const { status: statusFilter } = bodyParsed.data;
    const recipes = await getRecipesByProject(id);

    // Only refresh recipes matching the requested status filter (default: drafts only)
    const targets = statusFilter
      ? recipes.filter((r) => r.status === statusFilter)
      : recipes.filter((r) => r.status === "draft");

    if (targets.length === 0) {
      return NextResponse.json({ refreshed: 0, message: "No matching recipes to refresh" });
    }

    log.info("Starting batch content refresh", { projectId: id, count: targets.length });

    let refreshed = 0;
    let failed = 0;

    for (const recipe of targets) {
      try {
        const content = await refreshRecipeContent(
          recipe.keyword,
          recipe.title,
          project.niche,
          project.content_tone,
          recipe.restaurant_name
        );
        await updateRecipe(recipe.id, {
          intro_content: content.intro_content,
          seo_title: content.seo_title,
          seo_description: content.seo_description,
          focus_keywords: content.focus_keywords,
        });
        refreshed++;
      } catch (err) {
        log.error("Failed to refresh recipe", { recipeId: recipe.id, keyword: recipe.keyword }, err);
        failed++;
      }
    }

    log.info("Batch refresh complete", { projectId: id, refreshed, failed });

    return NextResponse.json({
      refreshed,
      failed,
      message: `Refreshed ${refreshed} recipe${refreshed !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
    });
  } catch (error) {
    log.error("Batch refresh failed", { projectId: id }, error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
