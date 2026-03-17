import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfile, getAllProfiles } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AdminUsers");

const PatchSchema = z.object({
  subscription_status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.user_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const updates = parsed.data;

    // Self-demotion guard
    if (userId === user.id && updates.role === "user") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }

    // Last-admin guard
    if (updates.role === "user") {
      const allProfiles = await getAllProfiles();
      const otherAdmins = allProfiles.filter((p) => p.role === "admin" && p.id !== userId).length;
      if (otherAdmins === 0) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
      }
    }

    const updated = await updateProfile(userId, updates);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Immediate deactivation: revoke all sessions if subscription set to inactive
    if (updates.subscription_status === "inactive") {
      try {
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminSupabase.auth.admin.signOut(userId);
      } catch (revokeErr) {
        log.warn("Failed to revoke user sessions", { userId }, revokeErr);
      }
    }

    log.info("Admin updated user", { adminId: user.id, targetUserId: userId, updates });
    return NextResponse.json({ user: updated });
  } catch (err) {
    log.error("Failed to update user", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
