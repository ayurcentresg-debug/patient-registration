"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";
import TrialBanner from "@/components/TrialBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  // Register service worker for PWA support
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isInvitePage = pathname?.startsWith("/invite");
  const isRegisterPage = pathname === "/register";
  const isPricingPage = pathname === "/pricing";
  const isDoctorPortal = pathname?.startsWith("/doctor");
  const isSuperAdmin = pathname?.startsWith("/super-admin");

  // Super admin pages have their own layout — no clinic sidebar or auth
  if (isSuperAdmin) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Public pages render without sidebar or auth check
  if (isLandingPage || isLoginPage || isInvitePage || isRegisterPage || isPricingPage) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Doctor portal has its own header/layout — no sidebar
  if (isDoctorPortal) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <TrialBanner />
            <main className="min-h-screen">{children}</main>
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // All other pages get auth protection + sidebar + trial banner
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <TrialBanner />
          <div className="flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0 min-w-0 w-0 overflow-x-hidden max-w-full">{children}</main>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
