import { NextResponse } from "next/server";
import {
  getRecipesByProject,
  updateRecipe,
  getProject,
  updateProject,
} from "@/lib/store";
import { publishRecipeToSite } from "@/lib/site-publisher";
import { createLogger } from "@/lib/logger";
import { BulkPublishSchema } from "@/lib/validation";

const log = createLogger("API:BulkPublish");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Parse optional body — empty body (Content-Length: 0) is fine
    let recipeIds: string[] | undefined;
    let count: number | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await request.json().catch(() => ({}));
      const parsed = BulkPublishSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      recipeIds = parsed.data.recipeIds;
      count = parsed.data.count;
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const all = await getRecipesByProject(projectId);
    // If specific IDs were provided, only publish those that are still drafts
    let drafts = recipeIds
      ? all.filter((r) => recipeIds!.includes(r.id) && r.status === "draft")
      : all.filter((r) => r.status === "draft");

    // Sort oldest-first so scheduled partial publishing is chronological
    drafts = drafts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // If a count limit was provided (scheduled publish), take only the first N
    if (count !== undefined) drafts = drafts.slice(0, count);

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

    // Re-fetch project to get current counter (avoids TOCTOU race with concurrent generation)
    const freshProject = await getProject(projectId);
    await updateProject(projectId, {
      recipes_published: (freshProject?.recipes_published ?? project.recipes_published ?? 0) + published,
    });

    log.info("Bulk publish completed", { projectId, published, failed });

    // Fire-and-forget: ping search engines with updated sitemap
    if (published > 0) {
      const pingUrl = new URL(`/api/projects/${projectId}/sitemap/ping`, request.url);
      fetch(pingUrl.toString(), { method: "POST" }).catch(() => {});
    }

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
