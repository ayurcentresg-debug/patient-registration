"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProgressRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/treatments/progress"); }, [router]);
  return null;
}
