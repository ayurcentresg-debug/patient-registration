"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";
import TrialBanner from "@/components/TrialBanner";
import StatusBanner from "@/components/StatusBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FlashCardProvider } from "@/components/FlashCardProvider";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import OfflineBanner from "@/components/OfflineBanner";
import TopBar from "@/components/TopBar";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || "";

  // Register the service worker for PWA offline mode.
  // The SW uses a versioned CACHE_NAME so old caches get evicted on each
  // bumped release — preventing the stale-JS issue that bit us before.
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Defer to idle so registration doesn't block first-paint
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => { /* ignore registration failures */ });
    };
    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback?.(register);
    } else {
      setTimeout(register, 1500);
    }
  }, []);

  const isLandingPage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isInvitePage = pathname.startsWith("/invite");
  const isRegisterPage = pathname === "/register";
  const isPricingPage = pathname === "/pricing";
  // Only the initial onboarding wizard (/onboarding) is public — the Setup
  // Guide (/onboarding/dashboard) is accessed from the sidebar after login
  // and should use the normal authenticated layout.
  const isOnboardingPage = pathname === "/onboarding";
  const isBookingPage = pathname.startsWith("/book");
  const isDoctorPortal = pathname.startsWith("/doctor");
  const isSuperAdmin = pathname.startsWith("/super-admin");
  const isHelpPage = pathname === "/help"; // public so sales can share the URL
  // CME removed — going to separate repo (~/Desktop/ayurcme-plan.md)

  // All public pages — no auth, no sidebar
  const isPublicPage =
    isLandingPage || isLoginPage || isInvitePage || isRegisterPage ||
    isPricingPage || isOnboardingPage || isBookingPage || isHelpPage;

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
                <OfflineBanner />
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

  // All other pages get auth protection + sidebar + trial banner
  return (
    <ThemeProvider>
      <AuthProvider>
        <FlashCardProvider>
          <ConfirmDialogProvider>
            <ErrorBoundary>
              <TrialBanner />
              <StatusBanner />
              <EmailVerifyBanner />
                <TopBar />
              <div className="flex min-h-screen overflow-x-hidden">
                <Sidebar />
                <main className="flex-1 pt-[var(--header-height,56px)] md:pt-[var(--header-height,56px)] pb-20 md:pb-0 min-w-0 overflow-x-hidden max-w-full" role="main">{children}</main>
              </div>
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </FlashCardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
