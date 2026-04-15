"use client";

import { useParams } from "next/navigation";
import StaffFormPage from "../../StaffFormPage";

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) {
    return <div className="p-8 text-[15px]" style={{ color: "var(--grey-600)" }}>Loading…</div>;
  }

  return <StaffFormPage mode="edit" staffId={id} />;
}
