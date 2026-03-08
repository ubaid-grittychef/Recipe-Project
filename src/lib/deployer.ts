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

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not set. Add it to .env.local");
  return token;
}

function getVercelTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID || undefined;
}

async function vercelApi(
  urlPath: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<unknown> {
  const token = getVercelToken();
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

  const data = await res.json();
  if (!res.ok) {
    log.error("Vercel API error", {
      path: urlPath,
      status: res.status,
      error: data,
    });
    throw new Error(
      data?.error?.message ?? `Vercel API ${res.status}: ${urlPath}`
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

  const result = (await vercelApi("/v10/projects", "POST", {
    name: vercelName,
    framework: "nextjs",
  })) as { id: string };

  await updateProject(projectId, { vercel_project_id: result.id });
  log.info("Vercel project created", { vercelProjectId: result.id });
  return result.id;
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
    `/v10/projects/${project.vercel_project_id}/env`
  )) as { envs?: Array<{ id: string; key: string }> };

  const keysToSet = new Set(Object.keys(envVars));
  for (const env of existing.envs ?? []) {
    if (keysToSet.has(env.key)) {
      await vercelApi(
        `/v10/projects/${project.vercel_project_id}/env/${env.id}`,
        "DELETE"
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
    envList
  );
}

export function buildSiteEnvVars(project: {
  name: string;
  tagline: string;
  meta_description: string;
  author_name: string;
  domain: string;
  primary_color: string;
  font_preset: string;
  site_supabase_url: string | null;
  site_supabase_anon_key: string | null;
  skimlinks_id: string | null;
  amazon_associate_id: string | null;
  hellofresh_url: string | null;
  adsense_publisher_id: string | null;
  ga_id: string | null;
}): Record<string, string> {
  const vars: Record<string, string> = {
    NEXT_PUBLIC_SITE_NAME: project.name,
    NEXT_PUBLIC_SITE_TAGLINE: project.tagline,
    NEXT_PUBLIC_SITE_DESCRIPTION: project.meta_description,
    NEXT_PUBLIC_SITE_AUTHOR: project.author_name,
    NEXT_PUBLIC_SITE_URL: project.domain
      ? `https://${project.domain}`
      : "",
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
  templateDir: string
): Promise<void> {
  const token = getVercelToken();
  const teamId = getVercelTeamId();
  const fullPath = path.join(templateDir, filePath);
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

    const envVars = buildSiteEnvVars(project);
    await setVercelEnvVars(projectId, envVars);

    await updateDeployment(deployment.id, { status: "building" });

    const templateDir = path.resolve(process.cwd(), "template");
    if (!fs.existsSync(templateDir)) {
      throw new Error(
        `Template directory not found at ${templateDir}. The /template folder must exist in the project root.`
      );
    }

    log.info("Collecting template files", { templateDir });
    const files = collectFiles(templateDir);
    log.info("Template files collected", { count: files.length });

    for (const f of files) {
      await uploadFile(f.file, templateDir);
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
    })) as { id: string; url: string; readyState: string };

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
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Deployment failed", { projectId }, error);

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
    { name: domain }
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
    `/v9/projects/${project.vercel_project_id}/domains/${domain}`
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
    "DELETE"
  );
}

export async function getDeploymentStatus(
  vercelDeploymentId: string
): Promise<{ state: string; url: string }> {
  const result = (await vercelApi(
    `/v13/deployments/${vercelDeploymentId}`
  )) as { readyState: string; url: string };

  return { state: result.readyState, url: result.url };
}
