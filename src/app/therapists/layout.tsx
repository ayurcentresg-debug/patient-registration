import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Therapists",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
