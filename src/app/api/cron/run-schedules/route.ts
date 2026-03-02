import { NextResponse } from "next/server";
import { runDueProjects } from "@/lib/scheduler";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Cron");

// BUG 2 FIX: Vercel Cron endpoint — called every 5 minutes by Vercel.
// Replaces node-cron for serverless deployments.
// Configured in vercel.json: { "crons": [{ "path": "/api/cron/run-schedules", "schedule": "*/5 * * * *" }] }
//
// Security: Vercel sets the "Authorization: Bearer <CRON_SECRET>" header on
// cron-triggered requests. We verify it here so random callers can't fire generation.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      log.warn("Cron request rejected — invalid or missing CRON_SECRET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    log.info("HTTP cron tick — checking for due projects");
    const result = await runDueProjects();
    log.info("HTTP cron tick complete", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error("HTTP cron tick failed", {}, error);
    return NextResponse.json(
      { error: "Cron run failed" },
      { status: 500 }
    );
  }
}
