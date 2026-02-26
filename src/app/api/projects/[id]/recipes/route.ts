import { NextResponse } from "next/server";
import { getRecipesByProject } from "@/lib/store";

const DEFAULT_LIMIT = 50;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      200
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();

    const all = await getRecipesByProject(id);

    // Apply search filter across all recipes before paginating
    const filtered = search
      ? all.filter(
          (r) =>
            r.title.toLowerCase().includes(search) ||
            r.keyword.toLowerCase().includes(search) ||
            (r.restaurant_name?.toLowerCase().includes(search) ?? false)
        )
      : all;

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
    console.error("Failed to fetch recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}
