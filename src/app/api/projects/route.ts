import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Projects");

export async function GET() {
  try {
    const projects = await getProjects();
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
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    log.info("Creating project", { name: body.name });
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    log.error("POST /api/projects failed", {}, error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
