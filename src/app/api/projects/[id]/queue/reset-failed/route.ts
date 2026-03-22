import { NextResponse } from "next/server";
import { getBuiltInKeywords, updateBuiltInKeyword } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Queue");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  try {
    const failed = await getBuiltInKeywords(id, "failed");
    await Promise.all(
      failed.map((kw) =>
        updateBuiltInKeyword(kw.id, { status: "pending", error_reason: null, processed_at: null })
      )
    );
    log.info("Reset failed keywords to pending", { projectId: id, count: failed.length });
    return NextResponse.json({ reset: failed.length });
  } catch (error) {
    log.error("Failed to reset failed keywords", { projectId: id }, error);
    return NextResponse.json({ error: "Failed to reset failed keywords" }, { status: 500 });
  }
}
