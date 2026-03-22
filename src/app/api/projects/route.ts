import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { CreateProjectSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/auth-guard";

const log = createLogger("API:Projects");

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const projects = await getProjects(auth.userId);
    return NextResponse.json(projects);
  } catch (error) {
    log.error("GET /api/projects failed", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const raw = await request.json();
    const parsed = CreateProjectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    log.info("Creating project", { name: parsed.data.name });
    const project = await createProject({ ...parsed.data, user_id: auth.userId });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    log.error("POST /api/projects failed", {}, error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
