import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Health");

export interface SiteHealthResult {
  healthy: boolean | null;
  status_code?: number;
  latency_ms?: number;
  reason?: string;
  checked_at: string;
  url?: string;
}

/**
 * GET /api/projects/[id]/health
 *
 * Pings the project's live deployment URL and returns health status + latency.
 * Returns { healthy: null } if no deployment URL is configured.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = project.vercel_deployment_url;
  if (!url) {
    return NextResponse.json({
      healthy: null,
      reason: "No deployment URL configured",
      checked_at: new Date().toISOString(),
    } satisfies SiteHealthResult);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    const latency_ms = Date.now() - start;
    const healthy = res.status >= 200 && res.status < 400;

    log.info("Site health check", { projectId: id, url, status: res.status, latency_ms });

    return NextResponse.json({
      healthy,
      status_code: res.status,
      latency_ms,
      checked_at: new Date().toISOString(),
      url,
    } satisfies SiteHealthResult);
  } catch (err) {
    const latency_ms = Date.now() - start;
    const reason = err instanceof Error ? err.message : "Unreachable";
    log.warn("Site health check failed", { projectId: id, url, reason });

    return NextResponse.json({
      healthy: false,
      reason,
      latency_ms,
      checked_at: new Date().toISOString(),
      url,
    } satisfies SiteHealthResult);
  }
}
