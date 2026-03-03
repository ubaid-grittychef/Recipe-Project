import { NextResponse } from "next/server";
import { getRecipesByProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Recipes");

const DEFAULT_LIMIT = 50;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      200
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const statusFilter = searchParams.get("status") ?? "";
    const sort = searchParams.get("sort") ?? "created_at";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const all = await getRecipesByProject(id);

    // Apply search and status filters before paginating
    const filtered = all.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        return (
          r.title.toLowerCase().includes(search) ||
          r.keyword.toLowerCase().includes(search) ||
          (r.restaurant_name?.toLowerCase().includes(search) ?? false)
        );
      }
      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sort === "word_count") {
        va = a.word_count ?? 0;
        vb = b.word_count ?? 0;
      } else if (sort === "published_at") {
        va = a.published_at ?? a.created_at;
        vb = b.published_at ?? b.created_at;
      } else {
        va = a.created_at;
        vb = b.created_at;
      }
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

    const total = filtered.length;
    const recipes = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      recipes,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    log.error("Failed to fetch recipes", { projectId: id }, error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}
