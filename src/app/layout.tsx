import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14532d",
};

export const metadata: Metadata = {
  title: {
    default: "AyurGate — Ayurveda Clinic Management Software",
    template: "%s — AyurGate",
  },
  description: "AyurGate — Modern clinic management software for Ayurveda, wellness & healthcare practices. Appointments, billing, inventory, multi-branch & more.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com"),
  openGraph: {
    title: "AyurGate — Ayurveda Clinic Management Software",
    description: "Modern clinic management for Ayurveda & wellness practices. Appointments, billing, inventory, prescriptions, multi-branch — all in one platform.",
    siteName: "AyurGate",
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: "AyurGate — Ayurveda Clinic Management Software",
    description: "Modern clinic management for Ayurveda & wellness practices. Appointments, billing, inventory, prescriptions & more.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AyurGate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
