import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AdminUsers");

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
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
