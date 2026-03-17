import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AdminUsers");

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.user_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profiles = await getAllProfiles();
    return NextResponse.json({ users: profiles });
  } catch (err) {
    log.error("Failed to fetch users", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
