import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { CreateProjectSchema } from "@/lib/validation";

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
    const raw = await request.json();
    const parsed = CreateProjectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    log.info("Creating project", { name: parsed.data.name });
    const project = await createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    log.error("POST /api/projects failed", {}, error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
