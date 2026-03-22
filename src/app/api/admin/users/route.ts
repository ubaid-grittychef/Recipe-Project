import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth-guard";

const log = createLogger("API:AdminUsers");

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    // Additional admin role check
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.userId)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profiles = await getAllProfiles();
    return NextResponse.json({ users: profiles });
  } catch (err) {
    log.error("Failed to fetch users", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
