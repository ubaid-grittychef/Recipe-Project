import { NextResponse } from "next/server";
import { getCategories } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/auth-guard";

const log = createLogger("API:Categories");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  try {
    const categories = await getCategories(id);
    return NextResponse.json({ categories });
  } catch (error) {
    log.error("Failed to fetch categories", { projectId: id }, error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
