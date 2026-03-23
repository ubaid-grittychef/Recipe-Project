import { createLogger } from "./logger";
import {
  getProject,
  updateProject,
  createDeployment,
  updateDeployment,
} from "./store";
import { Deployment } from "./types";
import { generateId, withRetry } from "./utils";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const log = createLogger("Deployer");

/**
 * Resolves the Vercel API token.
 * Per-project token takes priority over the global VERCEL_TOKEN env var,
 * ensuring each customer's site deploys to their own Vercel account.
 */
function getVercelToken(projectToken?: string | null): string {
  const token = projectToken || process.env.VERCEL_TOKEN;
  if (!token) throw new Error(
    "No Vercel token configured. Add your Vercel API token in project Settings → Deployment."
  );
  return token;
}

function getVercelTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID || undefined;
}

async function vercelApi(
  urlPath: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  projectToken?: string | null
): Promise<unknown> {
  const token = getVercelToken(projectToken);
  const teamId = getVercelTeamId();
  const url = new URL(`https://api.vercel.com${urlPath}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await withRetry(() =>
    fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  );

  let data: unknown = {};
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status !== 204 && contentType.includes("application/json")) {
    try { data = await res.json(); } catch { data = {}; }
  }
  if (!res.ok) {
    log.error("Vercel API error", {
      path: urlPath,
      status: res.status,
      error: data,
    });
    throw new Error(
      (data as Record<string, Record<string, string>>)?.error?.message ?? `Vercel API ${res.status}: ${urlPath}`
    );
  }
  return data;
}

export async function createVercelProject(
  projectId: string
): Promise<string> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  const slug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const vercelName = `recipe-${slug}-${projectId.slice(0, 8)}`;

  log.info("Creating Vercel project", { name: vercelName, projectId });

  let vercelProjectId: string;

  try {
    const result = (await vercelApi("/v10/projects", "POST", {
      name: vercelName,
      framework: "nextjs",
    }, project.vercel_token)) as { id: string };
    vercelProjectId = result.id;
    log.info("Vercel project created", { vercelProjectId });
  } catch (err) {
    // Project already exists — look it up by name and reuse it
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already exists") || msg.includes("409") || msg.includes("422")) {
      log.warn("Vercel project already exists — fetching existing project", { name: vercelName });
      const existing = (await vercelApi(
        `/v10/projects/${vercelName}`,
        "GET", undefined, project.vercel_token
      )) as { id: string };
      vercelProjectId = existing.id;
      log.info("Reusing existing Vercel project", { vercelProjectId });
    } else {
      throw err;
    }
  }

  await updateProject(projectId, { vercel_project_id: vercelProjectId });
  return vercelProjectId;
}

export async function setVercelEnvVars(
  projectId: string,
  envVars: Record<string, string>
): Promise<void> {
  const project = await getProject(projectId);
  if (!project?.vercel_project_id)
    throw new Error("No Vercel project linked");

  log.info("Setting env vars", {
    projectId,
    count: Object.keys(envVars).length,
  });

  // BUG 5 FIX: upsert env vars — delete existing ones first to avoid 409 Conflict on redeploy
  const existing = (await vercelApi(
    `/v10/projects/${project.vercel_project_id}/env`,
    "GET", undefined, project.vercel_token
  )) as { envs?: Array<{ id: string; key: string }> };

  const keysToSet = new Set(Object.keys(envVars));
  for (const env of existing.envs ?? []) {
    if (keysToSet.has(env.key)) {
      await vercelApi(
        `/v10/projects/${project.vercel_project_id}/env/${env.id}`,
        "DELETE", undefined, project.vercel_token
      );
    }
  }

  const envList = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    type: key.startsWith("NEXT_PUBLIC_") ? ("plain" as const) : ("encrypted" as const),
    target: ["production", "preview"],
  }));

  await vercelApi(
    `/v10/projects/${project.vercel_project_id}/env`,
    "POST",
    envList,
    project.vercel_token
  );
}

export function buildSiteEnvVars(project: {
  name: string;
  tagline: string;
  meta_description: string;
  author_name: string;
  domain: string | null;
  primary_color: string;
  font_preset: string;
  site_supabase_url: string | null;
  site_supabase_anon_key: string | null;
  skimlinks_id: string | null;
  amazon_associate_id: string | null;
  hellofresh_url: string | null;
  adsense_publisher_id: string | null;
  ga_id: string | null;
  template_variant?: string | null;
  newsletter_url?: string | null;
  pinterest_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
}): Record<string, string> {
  const vars: Record<string, string> = {
    NEXT_PUBLIC_SITE_NAME: project.name,
    NEXT_PUBLIC_SITE_TAGLINE: project.tagline,
    NEXT_PUBLIC_SITE_DESCRIPTION: project.meta_description,
    NEXT_PUBLIC_SITE_AUTHOR: project.author_name,
    NEXT_PUBLIC_SITE_URL: project.domain
      ? `https://${project.domain}`
      : "https://example.com",
    NEXT_PUBLIC_PRIMARY_COLOR: project.primary_color,
    NEXT_PUBLIC_FONT_PRESET: project.font_preset,
  };

  if (project.site_supabase_url)
    vars.NEXT_PUBLIC_SUPABASE_URL = project.site_supabase_url;
  if (project.site_supabase_anon_key)
    vars.NEXT_PUBLIC_SUPABASE_ANON_KEY = project.site_supabase_anon_key;
  if (project.skimlinks_id)
    vars.NEXT_PUBLIC_SKIMLINKS_ID = project.skimlinks_id;
  if (project.amazon_associate_id)
    vars.NEXT_PUBLIC_AMAZON_TAG = project.amazon_associate_id;
  if (project.hellofresh_url)
    vars.NEXT_PUBLIC_HELLOFRESH_URL = project.hellofresh_url;
  if (project.adsense_publisher_id)
    vars.NEXT_PUBLIC_ADSENSE_ID = project.adsense_publisher_id;
  if (project.ga_id)
    vars.NEXT_PUBLIC_GA_ID = project.ga_id;
  if (project.template_variant && project.template_variant !== "default")
    vars.NEXT_PUBLIC_TEMPLATE_VARIANT = project.template_variant;

  // Social & Newsletter
  if (project.newsletter_url)
    vars.NEXT_PUBLIC_NEWSLETTER_URL = project.newsletter_url;
  if (project.pinterest_url)
    vars.NEXT_PUBLIC_PINTEREST_URL = project.pinterest_url;
  if (project.instagram_url)
    vars.NEXT_PUBLIC_INSTAGRAM_URL = project.instagram_url;
  if (project.facebook_url)
    vars.NEXT_PUBLIC_FACEBOOK_URL = project.facebook_url;
  if (project.twitter_url)
    vars.NEXT_PUBLIC_TWITTER_URL = project.twitter_url;
  if (project.youtube_url)
    vars.NEXT_PUBLIC_YOUTUBE_URL = project.youtube_url;
  if (project.tiktok_url)
    vars.NEXT_PUBLIC_TIKTOK_URL = project.tiktok_url;

  return vars;
}

/* ---------------------------------------------------------------
   File-based deployment: reads the /template folder, hashes each
   file, and uploads directly to Vercel. No GitHub repo needed.
   --------------------------------------------------------------- */

interface FileEntry {
  file: string;
  sha: string;
  size: number;
}

function collectFiles(dir: string, base: string = ""): FileEntry[] {
  const entries: FileEntry[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = base ? `${base}/${item.name}` : item.name;

    if (item.name === "node_modules" || item.name === ".next" || item.name === ".git") {
      continue;
    }

    if (item.isDirectory()) {
      entries.push(...collectFiles(fullPath, relativePath));
    } else if (item.isFile()) {
      const content = fs.readFileSync(fullPath);
      const sha = crypto.createHash("sha1").update(content).digest("hex");
      entries.push({ file: relativePath, sha, size: content.length });
    }
  }
  return entries;
}

async function uploadFile(
  filePath: string,
  templateDir: string,
  projectToken?: string | null
): Promise<void> {
  const token = getVercelToken(projectToken);
  const teamId = getVercelTeamId();
  // filePath uses forward slashes (Vercel format) — convert to OS path for fs
  const fullPath = path.join(templateDir, ...filePath.split("/"));
  const content = fs.readFileSync(fullPath);
  const sha = crypto.createHash("sha1").update(content).digest("hex");

  const url = new URL("https://api.vercel.com/v2/files");
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await withRetry(() =>
    fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "x-vercel-digest": sha,
        "x-vercel-size": String(content.length),
      },
      body: content,
    })
  );

  if (!res.ok && res.status !== 409) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      `File upload failed for ${filePath}: ${res.status} ${JSON.stringify(data)}`
    );
  }
}

export async function deployToVercel(projectId: string): Promise<Deployment> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  log.info("Starting deployment", { projectId, name: project.name });
  await updateProject(projectId, { deployment_status: "deploying" });

  const deployment: Deployment = {
    id: generateId(),
    project_id: projectId,
    vercel_deployment_id: null,
    vercel_project_id: project.vercel_project_id,
    url: null,
    domain: project.domain || null,
    status: "queued",
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    env_vars: buildSiteEnvVars(project),
  };

  await createDeployment(deployment);

  try {
    let vercelProjectId = project.vercel_project_id;
    if (!vercelProjectId) {
      vercelProjectId = await createVercelProject(projectId);
    }

    // Validate Supabase credentials are reachable before deploying
    if (project.site_supabase_url && project.site_supabase_anon_key) {
      try {
        const healthRes = await fetch(
          `${project.site_supabase_url}/rest/v1/`,
          {
            method: "HEAD",
            headers: { apikey: project.site_supabase_anon_key },
          }
        );
        if (healthRes.status === 401 || healthRes.status === 403) {
          throw new Error(
            `Site Supabase anon key is invalid (${healthRes.status}). Check your credentials in Project Settings.`
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("Site Supabase")) throw err;
        log.warn("Could not validate Supabase credentials — deploying anyway", { projectId }, err);
      }
    }

    const envVars = buildSiteEnvVars(project);
    await setVercelEnvVars(projectId, envVars);

    await updateDeployment(deployment.id, { status: "building" });

    const variant = project.template_variant ?? "default";
    const templateDirName = variant === "default" ? "template" : `template-${variant}`;
    const templateDir = path.resolve(process.cwd(), templateDirName);

    // Fall back to default template if the selected variant directory doesn't exist
    const resolvedTemplateDir = fs.existsSync(templateDir)
      ? templateDir
      : path.resolve(process.cwd(), "template");

    if (!fs.existsSync(resolvedTemplateDir)) {
      throw new Error(
        `Template directory not found at ${resolvedTemplateDir}. The /template folder must exist in the project root.`
      );
    }
    if (resolvedTemplateDir !== templateDir) {
      log.warn("Template variant not found, falling back to default", { variant, templateDirName });
    }

    // Validate template has required files before uploading
    const requiredFiles = ["package.json", "src/app/layout.tsx"];
    for (const reqFile of requiredFiles) {
      const reqPath = path.join(resolvedTemplateDir, ...reqFile.split("/"));
      if (!fs.existsSync(reqPath)) {
        throw new Error(
          `Template validation failed: missing ${reqFile}. The template directory must be a complete Next.js app.`
        );
      }
    }

    log.info("Collecting template files", { templateDir: resolvedTemplateDir, variant });
    const files = collectFiles(resolvedTemplateDir);
    log.info("Template files collected", { count: files.length });

    for (const f of files) {
      await uploadFile(f.file, resolvedTemplateDir, project.vercel_token);
    }
    log.info("All files uploaded to Vercel");

    const result = (await vercelApi("/v13/deployments", "POST", {
      name: project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      project: vercelProjectId,
      target: "production",
      files: files.map((f) => ({
        file: f.file,
        sha: f.sha,
        size: f.size,
      })),
      projectSettings: {
        framework: "nextjs",
      },
    }, project.vercel_token)) as { id: string; url: string; readyState: string };

    const deployUrl = `https://${result.url}`;

    await updateDeployment(deployment.id, {
      vercel_deployment_id: result.id,
      url: deployUrl,
      status: result.readyState === "READY" ? "ready" : "building",
      completed_at:
        result.readyState === "READY" ? new Date().toISOString() : null,
    });

    await updateProject(projectId, {
      vercel_deployment_url: deployUrl,
      deployment_status:
        result.readyState === "READY" ? "deployed" : "deploying",
    });

    log.info("Deployment initiated", {
      projectId,
      deploymentId: result.id,
      url: deployUrl,
      state: result.readyState,
    });

    return {
      ...deployment,
      vercel_deployment_id: result.id,
      url: deployUrl,
      status: result.readyState === "READY" ? "ready" : "building",
      completed_at:
        result.readyState === "READY" ? new Date().toISOString() : null,
    };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : "Unknown error";
    // Add context prefix for common failure modes
    const msg = rawMsg.includes("Template") ? `Template error: ${rawMsg}`
      : rawMsg.includes("Supabase") ? `Database error: ${rawMsg}`
      : rawMsg.includes("Vercel API") ? `Vercel API error: ${rawMsg}`
      : rawMsg.includes("File upload") ? `Upload error: ${rawMsg}`
      : rawMsg;
    log.error("Deployment failed", { projectId, errorContext: msg }, error);

    await updateDeployment(deployment.id, {
      status: "error",
      error_message: msg,
      completed_at: new Date().toISOString(),
    });

    await updateProject(projectId, { deployment_status: "failed" });

    return {
      ...deployment,
      status: "error",
      error_message: msg,
      completed_at: new Date().toISOString(),
    };
  }
}

export async function addDomain(
  projectId: string,
  domain: string
): Promise<{ configured: boolean; verification?: unknown }> {
  const project = await getProject(projectId);
  if (!project?.vercel_project_id) {
    throw new Error("Deploy the site first before adding a domain");
  }

  log.info("Adding domain", { projectId, domain });

  const result = (await vercelApi(
    `/v10/projects/${project.vercel_project_id}/domains`,
    "POST",
    { name: domain },
    project.vercel_token
  )) as { name: string; verified: boolean; verification?: unknown[] };

  await updateProject(projectId, { domain });

  return {
    configured: result.verified,
    verification: result.verification,
  };
}

export async function checkDomainStatus(
  projectId: string,
  domain: string
): Promise<{ verified: boolean; verification?: unknown }> {
  const project = await getProject(projectId);
  if (!project?.vercel_project_id) throw new Error("No Vercel project linked");

  const result = (await vercelApi(
    `/v9/projects/${project.vercel_project_id}/domains/${domain}`,
    "GET", undefined, project.vercel_token
  )) as { verified: boolean; verification?: unknown[] };

  return { verified: result.verified, verification: result.verification };
}

export async function removeDomain(
  projectId: string,
  domain: string
): Promise<void> {
  const project = await getProject(projectId);
  if (!project?.vercel_project_id) return;

  await vercelApi(
    `/v9/projects/${project.vercel_project_id}/domains/${domain}`,
    "DELETE", undefined, project.vercel_token
  );
}

export async function getDeploymentStatus(
  vercelDeploymentId: string,
  projectToken?: string | null
): Promise<{ state: string; url: string }> {
  const result = (await vercelApi(
    `/v13/deployments/${vercelDeploymentId}`,
    "GET", undefined, projectToken
  )) as { readyState: string; url: string };

  return { state: result.readyState, url: result.url };
}
