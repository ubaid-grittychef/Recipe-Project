import { NextResponse } from "next/server";
import { addDomain, removeDomain, checkDomainStatus } from "@/lib/deployer";
import { requireProjectAccess } from "@/lib/auth-guard";
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

    // Validate domain format — prevent SSRF / DNS injection
    const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!DOMAIN_RE.test(domain) || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;
    const { project } = auth;

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
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

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
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

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
