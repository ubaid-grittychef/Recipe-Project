import { NextResponse } from "next/server";
import { getKeywordLogs } from "@/lib/store";
import { resetKeywordsToPending } from "@/lib/sheets";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:KeywordsRetry");

/**
 * POST /api/projects/[id]/keywords/retry
 *
 * Resets all failed keywords in the Google Sheet back to pending (empty status)
 * so the next generation run will pick them up again.
 *
 * Optionally accepts { keywords: string[] } in the body to retry only specific keywords.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { project } = auth;

  if (!project.sheet_url) {
    return NextResponse.json(
      { error: "No Google Sheet configured for this project" },
      { status: 422 }
    );
  }

  // Parse optional body for specific keywords to retry
  let specificKeywords: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.keywords) && body.keywords.every((k: unknown) => typeof k === "string")) {
      specificKeywords = body.keywords;
    }
  } catch {
    // empty body is fine
  }

  // If no specific keywords given, find all failed ones from the factory DB
  if (!specificKeywords) {
    const allLogs = await getKeywordLogs(id);
    specificKeywords = allLogs
      .filter((l) => l.status === "failed")
      .map((l) => l.keyword);
  }

  if (specificKeywords.length === 0) {
    return NextResponse.json({ reset: 0, message: "No failed keywords to retry" });
  }

  log.info("Retrying failed keywords", { projectId: id, count: specificKeywords.length });

  try {
    const { reset } = await resetKeywordsToPending(
      project.sheet_url,
      project.sheet_keyword_column,
      project.sheet_status_column,
      specificKeywords
    );

    return NextResponse.json({
      reset,
      message: `Reset ${reset} keyword${reset !== 1 ? "s" : ""} to pending — they will be picked up on the next generation run`,
    });
  } catch (error) {
    log.error("Failed to reset keywords in sheet", { projectId: id }, error);
    return NextResponse.json(
      { error: "Failed to reset keywords in Google Sheet", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
