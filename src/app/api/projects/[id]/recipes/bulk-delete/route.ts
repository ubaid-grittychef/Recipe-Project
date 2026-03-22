import { NextResponse } from "next/server";
import { getRecipe, deleteRecipe } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { BulkDeleteSchema } from "@/lib/validation";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:BulkDelete");

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const auth = await requireProjectAccess(projectId);
    if (!auth.ok) return auth.response;

    const raw = await request.json().catch(() => ({}));
    const parsed = BulkDeleteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;
    log.info("Bulk deleting recipes", { projectId, count: ids.length });

    let deleted = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const recipe = await getRecipe(id);
        if (!recipe || recipe.project_id !== projectId) {
          log.warn("Skipping recipe — not found or belongs to different project", { recipeId: id, projectId });
          failed++;
          continue;
        }
        await deleteRecipe(id);
        deleted++;
      } catch (err) {
        log.warn("Failed to delete recipe", { recipeId: id }, err);
        failed++;
      }
    }

    return NextResponse.json({
      deleted,
      failed,
      message: `Deleted ${deleted} recipe${deleted !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (err) {
    log.error("Bulk delete failed", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
