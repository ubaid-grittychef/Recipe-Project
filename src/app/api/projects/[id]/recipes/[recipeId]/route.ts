import { NextResponse } from "next/server";
import { getRecipe, updateRecipe, deleteRecipe, getProject, updateProject } from "@/lib/store";
import { publishRecipeToSite } from "@/lib/site-publisher";
import { createLogger } from "@/lib/logger";
import { UpdateRecipeSchema } from "@/lib/validation";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Recipe");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const { id, recipeId } = await params;

    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

    const recipe = await getRecipe(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    log.error("GET recipe failed", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const { id: projectId, recipeId } = await params;

    const auth = await requireProjectAccess(projectId);
    if (!auth.ok) return auth.response;

    const raw = await request.json();

    // Strip read-only fields the client must not set
    const { id: _id, project_id: _pid, created_at: _ca, ...stripped } = raw;

    const parsed = UpdateRecipeSchema.safeParse(stripped);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Capture previous status BEFORE the update to detect publish transitions
    const previous = await getRecipe(recipeId);
    const wasAlreadyPublished = previous?.status === "published";

    // Set published_at on first publish; clear it if moving back to draft
    if (updates.status === "published" && !wasAlreadyPublished) {
      updates.published_at = new Date().toISOString();
    } else if (updates.status === "draft") {
      updates.published_at = null;
    }

    const updated = await updateRecipe(recipeId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const isNowPublished = updated.status === "published";
    const justPublished = isNowPublished && !wasAlreadyPublished;

    if (isNowPublished) {
      // Increment recipes_published only on the first publish transition
      if (justPublished) {
        const project = await getProject(projectId);
        if (project) {
          await updateProject(projectId, {
            recipes_published: (project.recipes_published ?? 0) + 1,
          });
          log.info("Incremented recipes_published", { projectId, recipeId });
        }
      }

      try {
        await publishRecipeToSite(projectId, updated);
      } catch (pubErr) {
        log.warn("Recipe updated but failed to sync to site DB", {
          recipeId,
          error: pubErr instanceof Error ? pubErr.message : String(pubErr),
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    log.error("PUT recipe failed", {}, error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const { id, recipeId } = await params;

    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

    await deleteRecipe(recipeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE recipe failed", {}, error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
