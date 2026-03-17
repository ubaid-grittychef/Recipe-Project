import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShellClient from "./AppShellClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = "user";
  let userEmail = "";
  let userFullName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", user.id)
      .single();
    userRole = profile?.role ?? "user";
    userEmail = profile?.email ?? user.email ?? "";
    userFullName = profile?.full_name ?? "";
  }

  return (
    <AppShellClient userRole={userRole} userEmail={userEmail} userFullName={userFullName}>
      {children}
    </AppShellClient>
  );
}
