import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — AyurGate",
  description: "Sign in to your AyurGate clinic management dashboard. Manage patients, appointments, billing, inventory & more.",
  openGraph: {
    title: "Sign In — AyurGate",
    description: "Sign in to your AyurGate clinic management dashboard. Manage patients, appointments, billing, inventory & more.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
