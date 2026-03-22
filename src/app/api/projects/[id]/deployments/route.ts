import { NextResponse } from "next/server";
import { getDeployments, updateDeployment, updateProject } from "@/lib/store";
import { getDeploymentStatus } from "@/lib/deployer";
import { requireProjectAccess } from "@/lib/auth-guard";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Deployments");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;

  try {
    const deployments = await getDeployments(id);

    // BUG 6 FIX: refresh any "building" deployments from Vercel's API
    for (const dep of deployments) {
      // Guard: mark stuck deployments with no Vercel ID as errors
      if (dep.status === "building" && !dep.vercel_deployment_id) {
        await updateDeployment(dep.id, {
          status: "error",
          error_message: "Deployment record missing Vercel ID — likely failed before upload",
          completed_at: new Date().toISOString(),
        });
        dep.status = "error";
        continue;
      }
      if (dep.vercel_deployment_id && dep.status === "building") {
        try {
          const { state } = await getDeploymentStatus(dep.vercel_deployment_id);
          if (state === "READY" || state === "ERROR" || state === "CANCELED") {
            const newStatus = state === "READY" ? "ready" : "error";
            await updateDeployment(dep.id, {
              status: newStatus,
              completed_at: new Date().toISOString(),
            });
            dep.status = newStatus;
            // Also update the project's deployment_status so the UI poll stops
            await updateProject(id, {
              deployment_status: state === "READY" ? "deployed" : "failed",
            });
          }
        } catch (syncErr) {
          // Non-critical: return stale status rather than failing the whole request
          log.warn("Failed to sync deployment status from Vercel", {
            deploymentId: dep.id,
            vercelId: dep.vercel_deployment_id,
          }, syncErr);
        }
      }
    }

    return NextResponse.json(deployments);
  } catch (error) {
    // BUG 8 FIX: use structured logger instead of console.error
    log.error("Failed to fetch deployments", { projectId: id }, error);
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    );
  }
}
