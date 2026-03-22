import { NextResponse } from "next/server";
import {
  testSiteConnection,
  setupSiteSchema,
  resetSiteSchema,
  RECIPES_TABLE_SQL,
} from "@/lib/site-publisher";
import { requireProjectAccess } from "@/lib/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

    const status = await testSiteConnection(id);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to test connection", connected: false, hasTable: false, recipeCount: 0 },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireProjectAccess(id);
    if (!auth.ok) return auth.response;

    const { action } = await request.json();

    if (action === "setup-schema") {
      // Verify site credentials are configured before running heavy setup
      if (!auth.project.site_supabase_url || !auth.project.site_supabase_service_key) {
        return NextResponse.json(
          { error: "Site Supabase credentials are not configured for this project" },
          { status: 400 }
        );
      }
      const result = await setupSiteSchema(id);
      return NextResponse.json(result);
    }

    if (action === "reset-schema") {
      if (!auth.project.site_supabase_url || !auth.project.site_supabase_service_key) {
        return NextResponse.json(
          { error: "Site Supabase credentials are not configured for this project" },
          { status: 400 }
        );
      }
      const result = await resetSiteSchema(id);
      return NextResponse.json(result);
    }

    if (action === "get-sql") {
      return NextResponse.json({ sql: RECIPES_TABLE_SQL });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
