import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/store";
import { Project } from "@/lib/types";

/**
 * Verify the current user is authenticated and owns the given project.
 * Returns { user, project } on success, or a NextResponse error to return early.
 */
export async function requireProjectAccess(
  projectId: string
): Promise<
  | { ok: true; userId: string; project: Project }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const project = await getProject(projectId);
  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  // Check ownership: project.user_id must match, unless user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && project.user_id && project.user_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { ok: true, userId: user.id, project };
}

/**
 * Verify the current user is authenticated. Returns userId on success.
 */
export async function requireAuth(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: user.id };
}
