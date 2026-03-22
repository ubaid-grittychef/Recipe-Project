import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runGenerationForProject } from "@/lib/generator";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProjectAccess } from "@/lib/auth-guard";

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

  // --- Auth & quota check ---
  type QuotaProfile = {
    monthly_recipe_quota: number;
    recipes_generated_this_month: number;
    quota_reset_at: string | null;
    role: string;
  };
  let profile: QuotaProfile | null = null;
  let userId: string | null = null;
  let supabaseService: ReturnType<typeof createClient> | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      supabaseService = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabaseService
        .from("profiles")
        .select("monthly_recipe_quota, recipes_generated_this_month, quota_reset_at, role")
        .eq("id", user.id)
        .single();
      profile = data as QuotaProfile | null;

      if (profile && profile.role !== "admin") {
        // Reset counter if billing period rolled over
        const now = new Date();
        if (!profile.quota_reset_at || new Date(profile.quota_reset_at) <= now) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseService.from("profiles") as any).update({
            recipes_generated_this_month: 0,
            quota_reset_at: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
          }).eq("id", user.id);
          profile.recipes_generated_this_month = 0;
        }

        if (profile.recipes_generated_this_month >= profile.monthly_recipe_quota) {
          return NextResponse.json({
            error: `Monthly quota reached (${profile.monthly_recipe_quota} recipes). Resets on the 1st of next month.`,
          }, { status: 429 });
        }
      }
    }
  } catch (authErr) {
    log.warn("Quota check skipped — auth unavailable", { projectId: id }, authErr);
  }

  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const { project } = auth;

  log.info("Manual generation triggered (async)", { project: project.name, id });

  // Surface configuration warnings without blocking the run
  const warnings: string[] = [];
  if (!process.env.OPENAI_API_KEY) {
    warnings.push("OPENAI_API_KEY is not set — recipe generation will fail. Add it to .env.local and restart the server.");
    log.warn("OPENAI_API_KEY missing — generation will fail", { projectId: id });
  }
  if (!process.env.PEXELS_API_KEY) {
    warnings.push("PEXELS_API_KEY is not set — generated recipes will have no images");
    log.warn("PEXELS_API_KEY missing — images will be skipped", { projectId: id });
  }
  if (project.status === "paused") {
    warnings.push("Project is paused — click Activate on the dashboard to resume scheduled runs");
  }

  // Fire-and-forget: respond immediately so the request does not time out on
  // Vercel (10s hobby / 60s pro). Progress is tracked via generation logs.
  void runGenerationForProject(id).then((result) => {
    log.info("Background generation completed", { project: project.name, ...result });

    // Increment quota counter after successful generation
    if (profile && profile.role !== "admin" && result.succeeded > 0 && supabaseService && userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseService.from("profiles") as any).update({
        recipes_generated_this_month: profile.recipes_generated_this_month + result.succeeded,
      }).eq("id", userId).then(() => {
        log.info("Quota counter incremented", { userId, added: result.succeeded });
      }).catch((quotaErr: unknown) => {
        log.warn("Failed to increment quota counter", { userId }, quotaErr);
      });
    }
  }).catch((err) => {
    log.error("Background generation failed", { project: project.name }, err);
  });

  return NextResponse.json(
    { message: "Generation started", project_id: id, warnings },
    { status: 202 }
  );
}
