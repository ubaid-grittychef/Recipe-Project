import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { runGenerationForProject } from "@/lib/generator";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Generate");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
