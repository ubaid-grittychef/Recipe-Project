import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { appendKeywordsToSheet } from "@/lib/sheets";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("API:KeywordsImport");

const ImportSchema = z.object({
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1),
        restaurant: z.string().default(""),
      })
    )
    .min(1)
    .max(500),
});

/**
 * POST /api/projects/[id]/keywords/import
 *
 * Appends new keywords directly to the project's Google Sheet so the next
 * generation run picks them up. Accepts up to 500 keywords per call.
 *
 * Body: { keywords: Array<{ keyword: string; restaurant?: string }> }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.sheet_url) {
    return NextResponse.json(
      { error: "No Google Sheet configured for this project" },
      { status: 422 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { keywords } = parsed.data;

  log.info("Importing keywords to sheet", { projectId: id, count: keywords.length });

  try {
    const { appended } = await appendKeywordsToSheet(
      project.sheet_url,
      project.sheet_keyword_column,
      project.sheet_restaurant_column,
      project.sheet_status_column,
      keywords
    );

    return NextResponse.json({
      appended,
      message: `Added ${appended} keyword${appended !== 1 ? "s" : ""} to your Google Sheet`,
    });
  } catch (error) {
    log.error("Failed to append keywords to sheet", { projectId: id }, error);
    return NextResponse.json(
      {
        error: "Failed to write to Google Sheet",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
