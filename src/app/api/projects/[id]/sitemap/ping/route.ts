import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:SitemapPing");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const auth = await requireProjectAccess(projectId);
    if (!auth.ok) return auth.response;
    const { project } = auth;

    const siteUrl =
      project.domain
        ? `https://${project.domain}`
        : project.vercel_deployment_url ?? null;

    if (!siteUrl) {
      return NextResponse.json(
        { pinged: false, message: "No deployment URL available — deploy the site first" },
        { status: 400 }
      );
    }

    const sitemapUrl = `${siteUrl.replace(/\/$/, "")}/sitemap.xml`;

    // Note: Google deprecated sitemap ping in Jan 2024 — Bing only.
    const pingTargets = [
      { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    ];

    const results: Record<string, { ok: boolean; status?: number }> = {};

    await Promise.all(
      pingTargets.map(async (target) => {
        try {
          const res = await fetch(target.url, {
            method: "GET",
            signal: AbortSignal.timeout(8000),
          });
          results[target.name] = { ok: res.ok, status: res.status };
          log.info(`Sitemap ping ${target.name}`, { projectId, status: res.status });
        } catch (err) {
          results[target.name] = { ok: false };
          log.warn(`Sitemap ping ${target.name} failed`, { projectId }, err);
        }
      })
    );

    const anyOk = Object.values(results).some((r) => r.ok);

    return NextResponse.json({
      pinged: anyOk,
      sitemapUrl,
      results,
      message: anyOk
        ? `Sitemap submitted to search engines`
        : "Ping requests sent (search engines may return non-200 — this is normal)",
    });
  } catch (error) {
    log.error("Sitemap ping failed", {}, error);
    return NextResponse.json(
      { error: "Ping failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
