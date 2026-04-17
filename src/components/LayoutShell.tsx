"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";
import TrialBanner from "@/components/TrialBanner";
import StatusBanner from "@/components/StatusBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { FlashCardProvider } from "@/components/FlashCardProvider";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || "";

  // Unregister any existing service worker + clear caches
  // (was causing stale JS to be served — forcing fresh loads now)
  useEffect(() => {
    setMounted(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        }).catch(() => {});
      }
    }
  }, []);

  const isLandingPage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isInvitePage = pathname.startsWith("/invite");
  const isRegisterPage = pathname === "/register";
  const isPricingPage = pathname === "/pricing";
  const isOnboardingPage = pathname.startsWith("/onboarding");
  const isBookingPage = pathname.startsWith("/book");
  const isDoctorPortal = pathname.startsWith("/doctor");
  const isSuperAdmin = pathname.startsWith("/super-admin");
  // Public CME pages (not /cme/admin) — have their own layout
  const isPublicCme = pathname.startsWith("/cme") && !pathname.startsWith("/cme/admin");

  // All public pages — no auth, no sidebar
  const isPublicPage =
    isLandingPage || isLoginPage || isInvitePage || isRegisterPage ||
    isPricingPage || isOnboardingPage || isBookingPage || isPublicCme;

  // Super admin pages have their own layout
  if (isSuperAdmin) {
    return <ThemeProvider><FlashCardProvider><ConfirmDialogProvider>{children}</ConfirmDialogProvider></FlashCardProvider></ThemeProvider>;
  }

  // Public pages render without sidebar or auth check
  if (isPublicPage) {
    return <ThemeProvider><FlashCardProvider><ConfirmDialogProvider>{children}</ConfirmDialogProvider></FlashCardProvider></ThemeProvider>;
  }

  // Before client mount, render just children to match SSR and avoid hydration mismatch
  // Auth check and layout switching happens only after mount
  if (!mounted) {
    return <ThemeProvider><FlashCardProvider><ConfirmDialogProvider>{children}</ConfirmDialogProvider></FlashCardProvider></ThemeProvider>;
  }

  // Doctor portal has its own header/layout — no sidebar
  if (isDoctorPortal) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <FlashCardProvider>
            <ConfirmDialogProvider>
              <ErrorBoundary>
                <TrialBanner />
                <StatusBanner />
                <main className="min-h-screen" role="main">{children}</main>
              </ErrorBoundary>
            </ConfirmDialogProvider>
          </FlashCardProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  // All other pages (including /cme/admin) get auth protection + sidebar + trial banner
  return (
    <ThemeProvider>
      <AuthProvider>
        <FlashCardProvider>
          <ConfirmDialogProvider>
            <ErrorBoundary>
              <TrialBanner />
              <StatusBanner />
              <EmailVerifyBanner />
              <div className="flex min-h-screen overflow-x-hidden">
                <Sidebar />
                <main className="flex-1 pt-14 pb-20 md:pb-0 min-w-0 overflow-x-hidden max-w-full" role="main">{children}</main>
              </div>
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </FlashCardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
