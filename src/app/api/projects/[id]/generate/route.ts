import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { runGenerationForProject } from "@/lib/generator";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/utils";

const log = createLogger("API:Generate");

// Allow at most 3 manual trigger calls per project per 5 minutes.
// The generation guard in generator.ts prevents concurrent runs; this
// prevents rapid-fire spam that would queue up future runs.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!checkRateLimit(`gen:${id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    log.warn("Generation rate limit exceeded", { projectId: id });
    return NextResponse.json(
      { error: "Too many generation requests. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  log.info("Manual generation triggered (async)", { project: project.name, id });

  // Fire-and-forget: respond immediately so the request does not time out on
  // Vercel (10s hobby / 60s pro). Progress is tracked via generation logs.
  void runGenerationForProject(id).then((result) => {
    log.info("Background generation completed", { project: project.name, ...result });
  }).catch((err) => {
    log.error("Background generation failed", { project: project.name }, err);
  });

  return NextResponse.json(
    { message: "Generation started", project_id: id },
    { status: 202 }
  );
}
