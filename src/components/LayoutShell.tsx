"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isInvitePage = pathname?.startsWith("/invite");
  const isDoctorPortal = pathname?.startsWith("/doctor");

  // Login & invite pages render without sidebar or auth check
  if (isLoginPage || isInvitePage) {
    return <>{children}</>;
  }

  // Doctor portal has its own header/layout — no sidebar
  if (isDoctorPortal) {
    return (
      <AuthProvider>
        <main className="min-h-screen">{children}</main>
      </AuthProvider>
    );
  }

  // All other pages get auth protection + sidebar
  return (
    <AuthProvider>
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0 min-w-0">{children}</main>
      </div>
    </AuthProvider>
  );
}
