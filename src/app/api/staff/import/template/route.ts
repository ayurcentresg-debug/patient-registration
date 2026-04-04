import { NextResponse } from "next/server";

const CSV_TEMPLATE = `name,email,phone,role,gender,ethnicity,specialization,department,consultationFee,slotDuration
Dr. Example Name,doctor@example.com,+6591234567,doctor,male,indian,Kayachikitsa,General Medicine,80,30
Jane Therapist,jane@example.com,+6598765432,therapist,female,chinese,Panchakarma,Therapy,60,45`;

export async function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=staff-import-template.csv",
    },
  });
}
