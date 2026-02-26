import type cron from "node-cron";

export interface JobEntry {
  task: cron.ScheduledTask;
  cronExpr: string;
}

const GLOBAL_KEY = "__recipe_factory_scheduler_jobs__" as const;

export function getActiveJobs(): Map<string, JobEntry> {
  const g = globalThis as unknown as Record<string, Map<string, JobEntry>>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map();
  }
  return g[GLOBAL_KEY];
}

export function getSchedulerStatus() {
  const jobs = getActiveJobs();
  return {
    activeJobs: jobs.size,
    jobIds: Array.from(jobs.keys()),
  };
}
