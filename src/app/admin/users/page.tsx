import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defence-in-depth: verify admin role server-side, not just middleware
  if (!user || user.app_metadata?.user_role !== "admin") {
    redirect("/");
  }

  const profiles = await getAllProfiles();
  return <AdminUsersClient profiles={profiles} currentUserId={user.id} />;
}
