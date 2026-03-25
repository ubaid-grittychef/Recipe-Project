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

  // Pre-flight checks
  const errors: string[] = [];

  if (!process.env.VERCEL_TOKEN) {
    errors.push("VERCEL_TOKEN is not set in environment variables.");
  }
  if (!project.site_supabase_url || !project.site_supabase_service_key) {
    errors.push("Site database credentials are not configured. Go to Settings → Deployment & Database.");
  }
  if (!project.site_supabase_anon_key) {
    errors.push("Site Supabase anon key is missing. The deployed site won't be able to read recipes.");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Pre-flight check failed", issues: errors },
      { status: 400 }
    );
  }

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
