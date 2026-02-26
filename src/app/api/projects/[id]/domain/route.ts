import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";
import { addDomain, removeDomain, checkDomainStatus } from "@/lib/deployer";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Domain");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    log.info("Adding domain", { project: project.name, domain });
    const result = await addDomain(id, domain);

    return NextResponse.json(result);
  } catch (error) {
    log.error("Add domain failed", {}, error);
    return NextResponse.json(
      {
        error: "Failed to add domain",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "domain query param required" },
        { status: 400 }
      );
    }

    const result = await checkDomainStatus(id, domain);
    return NextResponse.json(result);
  } catch (error) {
    log.error("Domain check failed", {}, error);
    return NextResponse.json(
      { error: "Failed to check domain status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    await removeDomain(id, domain);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Remove domain failed", {}, error);
    return NextResponse.json(
      { error: "Failed to remove domain" },
      { status: 500 }
    );
  }
}
