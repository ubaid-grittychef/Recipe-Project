import { NextResponse } from "next/server";
import {
  testSiteConnection,
  setupSiteSchema,
  resetSiteSchema,
  RECIPES_TABLE_SQL,
} from "@/lib/site-publisher";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { action } = await request.json();

    if (action === "setup-schema") {
      const result = await setupSiteSchema(id);
      return NextResponse.json(result);
    }

    if (action === "reset-schema") {
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
