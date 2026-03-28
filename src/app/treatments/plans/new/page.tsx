"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewPlanRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/treatments/plans/new"); }, [router]);
  return null;
}
