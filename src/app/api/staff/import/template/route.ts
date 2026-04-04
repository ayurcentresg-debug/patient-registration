import { NextResponse } from "next/server";

const CSV_TEMPLATE = `name,email,phone,role,gender,ethnicity,dateOfBirth,residencyStatus,prStartDate,dateOfJoining,specialization,department,consultationFee,slotDuration
Dr. Example Name,doctor@example.com,+6591234567,doctor,male,indian,1985-03-15,pr,2020-06-01,2022-01-10,Kayachikitsa,General Medicine,80,30
Jane Therapist,jane@example.com,+6598765432,therapist,female,chinese,1990-07-22,singaporean,,2023-04-01,Panchakarma,Therapy,60,45`;

export async function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=staff-import-template.csv",
    },
  });
}
