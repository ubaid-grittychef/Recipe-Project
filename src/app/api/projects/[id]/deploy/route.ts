import { NextResponse } from "next/server";
import { deployToVercel } from "@/lib/deployer";
import { requireProjectAccess } from "@/lib/auth-guard";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Deploy");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { project } = auth;

  log.info("Deploy requested (async)", { project: project.name, id });

  // Fire-and-forget — file uploads + Vercel API calls can exceed 60 s.
  // The client polls /api/projects/:id/deployments to track progress.
  void deployToVercel(id)
    .then((dep) => {
      log.info("Async deployment completed", { id, status: dep.status, url: dep.url });
    })
    .catch((err) => {
      log.error("Async deployment failed", { id }, err);
    });

  return NextResponse.json(
    { message: "Deployment started", project_id: id },
    { status: 202 }
  );
}
