"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, User, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";

interface Props {
  profiles: Profile[];
  currentUserId: string;
}

export default function AdminUsersClient({ profiles: initial, currentUserId }: Props) {
  const [profiles, setProfiles] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function patch(userId: string, updates: Record<string, string>) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Update failed"); return; }
      setProfiles((prev) => prev.map((p) => (p.id === userId ? data.user : p)));
      toast.success("User updated");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{profiles.length} total user{profiles.length !== 1 ? "s" : ""}</p>
        </div>
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 w-64"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subscription</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((profile) => (
              <tr key={profile.id} className="hover:bg-accent transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{profile.full_name || "—"}</div>
                  <div className="text-muted-foreground text-xs">{profile.email}</div>
                  {profile.id === currentUserId && (
                    <span className="text-xs text-brand-500 font-medium">You</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    profile.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {profile.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {profile.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    profile.subscription_status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {profile.subscription_status === "active"
                      ? <CheckCircle className="h-3 w-3" />
                      : <XCircle className="h-3 w-3" />}
                    {profile.subscription_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {loading === profile.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => patch(profile.id, {
                          subscription_status: profile.subscription_status === "active" ? "inactive" : "active",
                        })}
                        className={`text-xs font-medium hover:underline ${
                          profile.subscription_status === "active" ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        {profile.subscription_status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      {profile.id !== currentUserId && (
                        <button
                          onClick={() => patch(profile.id, {
                            role: profile.role === "admin" ? "user" : "admin",
                          })}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {profile.role === "admin" ? "Remove admin" : "Make admin"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  {search ? "No users match your search" : "No users yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
