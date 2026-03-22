import cron from "node-cron";
import {
  getProjects,
  getRecipesByProject,
  updateRecipe,
  updateProject,
  getProject,
} from "./store";
import { publishRecipeToSite } from "./site-publisher";
import { createLogger } from "./logger";

const log = createLogger("PublishScheduler");

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((n: unknown) => typeof n === "number")) {
      return [1, 2, 3, 4, 5];
    }
    return parsed;
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

function calcNextPublishAt(time: string, days: number[]): string {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const c = new Date(now);
    c.setDate(now.getDate() + i);
    c.setHours(hours, minutes, 0, 0);
    // getDay(): 0=Sun,1=Mon…6=Sat → ISO: Mon=1…Sun=7
    const isoDay = c.getDay() === 0 ? 7 : c.getDay();
    if (days.includes(isoDay) && c > now) return c.toISOString();
  }
  // Fallback: tomorrow same time
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}

// ── Core publish runner ───────────────────────────────────────────────────────

async function runScheduledPublishForProject(projectId: string, count: number): Promise<void> {
  const all = await getRecipesByProject(projectId);
  const drafts = all
    .filter((r) => r.status === "draft")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, count);

  if (drafts.length === 0) {
    log.info("Scheduled publish: no drafts available", { projectId });
    return;
  }

  const ts = new Date().toISOString();
  let published = 0;

  for (const recipe of drafts) {
    const updated = await updateRecipe(recipe.id, {
      status: "published",
      published_at: ts,
    }).catch(() => null);

    if (updated) {
      await publishRecipeToSite(projectId, updated).catch((e: unknown) =>
        log.warn("Failed to sync recipe to site DB", {
          recipeId: recipe.id,
          error: e instanceof Error ? e.message : String(e),
        })
      );
      published++;
    }
  }

  const fresh = await getProject(projectId);
  await updateProject(projectId, {
    last_published_at: ts,
    recipes_published: (fresh?.recipes_published ?? 0) + published,
  });

  log.info("Scheduled publish complete", { projectId, published });
}

// ── Vercel Cron entry point (HTTP-callable) ───────────────────────────────────

export async function runDuePublishes(): Promise<{
  triggered: string[];
  skipped: string[];
}> {
  const projects = await getProjects();
  const triggered: string[] = [];
  const skipped: string[] = [];
  const now = new Date();

  for (const project of projects) {
    if (project.status !== "active" || !project.publish_schedule_enabled) {
      skipped.push(project.id);
      continue;
    }

    const days = parseDays(project.publish_days ?? "[1,2,3,4,5]");
    const isoDay = now.getDay() === 0 ? 7 : now.getDay();

    if (!days.includes(isoDay)) {
      skipped.push(project.id);
      continue;
    }

    const [h, m] = (project.publish_time ?? "09:00").split(":").map(Number);
    const scheduledToday = new Date(now);
    scheduledToday.setHours(h, m, 0, 0);
    const diffMs = now.getTime() - scheduledToday.getTime();
    const isDue = diffMs >= 0 && diffMs < 5 * 60 * 1000;
    const missedRun =
      project.next_publish_at != null &&
      new Date(project.next_publish_at) <= now;

    if (!isDue && !missedRun) {
      skipped.push(project.id);
      continue;
    }

    triggered.push(project.id);

    // Update next_publish_at BEFORE fire-and-forget to prevent double-fire on next tick
    await updateProject(project.id, {
      next_publish_at: calcNextPublishAt(project.publish_time ?? "09:00", days),
    }).catch(() => {});

    const count = project.publish_per_day ?? 3;
    void runScheduledPublishForProject(project.id, count).catch((err) =>
      log.error("Scheduled publish failed", { projectId: project.id }, err)
    );
  }

  return { triggered, skipped };
}

// ── Local persistent scheduler (non-Vercel) ───────────────────────────────────

export function startScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runDuePublishes();
    } catch (error) {
      log.error("Publish tick failed", {}, error);
    }
  });
  log.info("Started — checking publish schedules every 5 minutes");
}

export function stopScheduler() {
  log.info("Scheduler stop requested");
}
