"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function PlanDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => { router.replace(`/admin/treatments/plans/${id}`); }, [router, id]);
  return null;
}
