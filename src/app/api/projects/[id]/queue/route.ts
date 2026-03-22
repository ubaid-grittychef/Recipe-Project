import { NextResponse } from "next/server";
import { getBuiltInKeywords, createBuiltInKeywords, deleteBuiltInKeywords } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Queue");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "pending" | "done" | "failed" | null;

  try {
    const allKeywords = await getBuiltInKeywords(id);
    const keywords = status ? allKeywords.filter((k) => k.status === status) : allKeywords;
    const counts = {
      pending: allKeywords.filter((k) => k.status === "pending").length,
      done: allKeywords.filter((k) => k.status === "done").length,
      failed: allKeywords.filter((k) => k.status === "failed").length,
    };
    return NextResponse.json({ keywords, counts });
  } catch (error) {
    log.error("Failed to fetch queue", { projectId: id }, error);
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;

  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Parse pasted text — one keyword per line
    // Supports: "keyword" or "keyword, Restaurant" or "keyword | Restaurant"
    const rows: Array<{ keyword: string; restaurant_name: string | null }> = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let keyword = trimmed;
      let restaurant_name: string | null = null;

      const separatorMatch = trimmed.match(/^(.+?)\s*[,|]\s*(.+)$/);
      if (separatorMatch) {
        keyword = separatorMatch[1].trim();
        restaurant_name = separatorMatch[2].trim() || null;
      }

      // Enforce per-keyword length limit
      if (keyword.length > 200) {
        keyword = keyword.slice(0, 200);
      }
      if (restaurant_name && restaurant_name.length > 200) {
        restaurant_name = restaurant_name.slice(0, 200);
      }

      if (keyword) {
        rows.push({ keyword, restaurant_name });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid keywords found" }, { status: 400 });
    }

    // Enforce max keywords per request to prevent abuse
    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Too many keywords. Maximum 500 per request." },
        { status: 400 }
      );
    }

    const created = await createBuiltInKeywords(id, rows);
    log.info("Added keywords to queue", { projectId: id, count: created.length });
    return NextResponse.json({ added: created.length, keywords: created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to add keywords";
    log.error("Failed to add keywords to queue", { projectId: id }, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "pending" | "done" | "failed" | null;

  try {
    await deleteBuiltInKeywords(id, status ?? undefined);
    log.info("Cleared queue", { projectId: id, status });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to clear queue", { projectId: id }, error);
    return NextResponse.json({ error: "Failed to clear queue" }, { status: 500 });
  }
}
