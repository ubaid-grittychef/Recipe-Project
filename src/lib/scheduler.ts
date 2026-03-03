import cron from "node-cron";
import { getProjects, updateProject } from "./store";
import { getActiveJobs } from "./scheduler-status";
import { createLogger } from "./logger";

const log = createLogger("Scheduler");

function timeToCron(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${minutes} ${hours} * * *`;
}

function nextRunAt(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

export function startScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await syncProjectSchedules();
    } catch (error) {
      log.error("Failed to sync schedules", {}, error);
    }
  });

  syncProjectSchedules();
  log.info("Started — checking projects every 5 minutes");
}

async function syncProjectSchedules() {
  const activeJobs = getActiveJobs();
  const projects = await getProjects();
  const activeProjectIds = new Set<string>();

  for (const project of projects) {
    if (project.status !== "active") {
      if (activeJobs.has(project.id)) {
        activeJobs.get(project.id)!.task.stop();
        activeJobs.delete(project.id);
        log.info("Stopped job (project not active)", { project: project.name });
      }
      continue;
    }

    activeProjectIds.add(project.id);
    const cronExpr = timeToCron(project.generation_time);
    const existing = activeJobs.get(project.id);

    if (existing && existing.cronExpr === cronExpr) {
      continue;
    }

    if (existing) {
      existing.task.stop();
      log.info("Rescheduling job (time changed)", {
        project: project.name,
        oldCron: existing.cronExpr,
        newCron: cronExpr,
      });
    }

    const task = cron.schedule(cronExpr, async () => {
      log.info("Running generation", { project: project.name, id: project.id });
      void updateProject(project.id, {
        next_scheduled_at: nextRunAt(project.generation_time),
      }).catch(() => { /* non-critical */ });
      try {
        const { runGenerationForProject } = await import("./generator");
        const result = await runGenerationForProject(project.id);
        log.info("Generation completed", {
          project: project.name,
          succeeded: result.succeeded,
          failed: result.failed,
        });
      } catch (error) {
        log.error("Generation failed", { project: project.name }, error);
      }
    });

    activeJobs.set(project.id, { task, cronExpr });

    void updateProject(project.id, {
      next_scheduled_at: nextRunAt(project.generation_time),
    }).catch(() => { /* non-critical */ });

    log.info("Scheduled job", { project: project.name, time: project.generation_time, cron: cronExpr });
  }

  for (const [id] of activeJobs) {
    if (!activeProjectIds.has(id)) {
      activeJobs.get(id)!.task.stop();
      activeJobs.delete(id);
    }
  }
}

export function stopScheduler() {
  const activeJobs = getActiveJobs();
  for (const [, entry] of activeJobs) {
    entry.task.stop();
  }
  activeJobs.clear();
  log.info("Stopped all jobs");
}

// BUG 2 FIX: HTTP-callable function for Vercel Cron Jobs.
// Checks all active projects and triggers generation for any whose
// generation_time falls within the current 5-minute window.
export async function runDueProjects(): Promise<{
  triggered: string[];
  skipped: string[];
}> {
  const projects = await getProjects();
  const triggered: string[] = [];
  const skipped: string[] = [];
  const now = new Date();

  for (const project of projects) {
    if (project.status !== "active") {
      skipped.push(project.id);
      continue;
    }

    const [hours, minutes] = project.generation_time.split(":").map(Number);
    const scheduledToday = new Date(now);
    scheduledToday.setHours(hours, minutes, 0, 0);

    // Fire if we're within a 5-minute window of the scheduled time
    const diffMs = now.getTime() - scheduledToday.getTime();
    const isDue = diffMs >= 0 && diffMs < 5 * 60 * 1000;

    // Also fire if next_scheduled_at is in the past (missed run)
    const missedRun =
      project.next_scheduled_at != null &&
      new Date(project.next_scheduled_at) <= now;

    if (isDue || missedRun) {
      triggered.push(project.id);
      log.info("Triggering due project via HTTP cron", {
        project: project.name,
        generation_time: project.generation_time,
        missed: missedRun && !isDue,
      });
      // Update next_scheduled_at synchronously BEFORE fire-and-forget to
      // prevent the missedRun check from re-triggering on the next cron tick.
      await updateProject(project.id, {
        next_scheduled_at: nextRunAt(project.generation_time),
      }).catch(() => { /* non-critical */ });
      // Fire-and-forget — don't block the cron response
      void (async () => {
        try {
          const { runGenerationForProject } = await import("./generator");
          await runGenerationForProject(project.id);
          log.info("HTTP cron generation completed", { project: project.name });
        } catch (err) {
          log.error("HTTP cron generation failed", { project: project.name }, err);
        }
      })();
    } else {
      skipped.push(project.id);
    }
  }

  return { triggered, skipped };
}

export { getSchedulerStatus } from "./scheduler-status";
