import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Auth:Me");

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json(profile);
  } catch (err) {
    log.error("Failed to fetch profile", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
