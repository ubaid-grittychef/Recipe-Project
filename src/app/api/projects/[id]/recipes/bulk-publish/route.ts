import { NextResponse } from "next/server";
import {
  getRecipesByProject,
  updateRecipe,
  getProject,
  updateProject,
} from "@/lib/store";
import { publishRecipeToSite } from "@/lib/site-publisher";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:BulkPublish");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const recipes = await getRecipesByProject(projectId);
    const drafts = recipes.filter((r) => r.status === "draft");

    if (drafts.length === 0) {
      return NextResponse.json({ published: 0, message: "No draft recipes to publish" });
    }

    log.info("Bulk publish started", { projectId, draftCount: drafts.length });

    const now = new Date().toISOString();
    let published = 0;
    let failed = 0;

    for (const recipe of drafts) {
      try {
        const updated = await updateRecipe(recipe.id, {
          status: "published",
          published_at: now,
        });

        if (updated) {
          try {
            await publishRecipeToSite(projectId, updated);
          } catch (pubErr) {
            log.warn("Bulk publish: failed to sync recipe to site DB", {
              recipeId: recipe.id,
              error: pubErr instanceof Error ? pubErr.message : String(pubErr),
            });
          }
          published++;
        }
      } catch (err) {
        log.error("Bulk publish: failed to update recipe", { recipeId: recipe.id }, err);
        failed++;
      }
    }

    // Update the project's published counter
    await updateProject(projectId, {
      recipes_published: (project.recipes_published ?? 0) + published,
    });

    log.info("Bulk publish completed", { projectId, published, failed });

    return NextResponse.json({
      published,
      failed,
      message: `Published ${published} recipe${published !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (error) {
    log.error("Bulk publish failed", {}, error);
    return NextResponse.json(
      { error: "Bulk publish failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
