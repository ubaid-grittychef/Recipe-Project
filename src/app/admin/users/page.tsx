import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Read role from DB (not JWT claims — JWT hook was removed)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const profiles = await getAllProfiles();
  return <AdminUsersClient profiles={profiles} currentUserId={user.id} />;
}
