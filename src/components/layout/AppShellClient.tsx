"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface Props {
  children: React.ReactNode;
  userRole: string;
  userEmail: string;
  userFullName: string;
}

export default function AppShellClient({ children, userRole, userEmail, userFullName }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/signup" ||
    pathname.startsWith("/auth/") || pathname === "/access-required";

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userRole={userRole}
        userEmail={userEmail}
        userFullName={userFullName}
      />
      <div className="lg:pl-64">
        <Header onMenuToggle={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}
