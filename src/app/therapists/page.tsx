"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TherapistsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/staff?role=therapist"); }, [router]);
  return null;
}
