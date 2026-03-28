"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Login page renders without sidebar or auth check
  if (isLoginPage) {
    return <>{children}</>;
  }

  // All other pages get auth protection + sidebar
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
    </AuthProvider>
  );
}
