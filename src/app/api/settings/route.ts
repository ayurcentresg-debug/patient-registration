import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/settings - Fetch clinic settings (upsert with defaults if not found)
export async function GET() {
  try {
    const settings = await prisma.clinicSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        clinicName: "Ayurveda Wellness Clinic",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        email: "",
        website: "",
        gstRegistrationNo: "",
        termsAndConditions:
          "Payment is due upon receipt. Medical services are subject to GST at prevailing rates.",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update clinic settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const allowedFields = [
      "clinicName",
      "address",
      "city",
      "state",
      "zipCode",
      "phone",
      "email",
      "website",
      "gstRegistrationNo",
      "termsAndConditions",
      "logoUrl",
      "currency",
      "dateFormat",
      "timeFormat",
      "appointmentDuration",
      "workingHoursStart",
      "workingHoursEnd",
      "workingDays",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const settings = await prisma.clinicSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        clinicName: (updateData.clinicName as string) || "Ayurveda Wellness Clinic",
        address: (updateData.address as string) || "",
        city: (updateData.city as string) || "",
        state: (updateData.state as string) || "",
        zipCode: (updateData.zipCode as string) || "",
        phone: (updateData.phone as string) || "",
        email: (updateData.email as string) || "",
        website: (updateData.website as string) || "",
        gstRegistrationNo: (updateData.gstRegistrationNo as string) || "",
        termsAndConditions:
          (updateData.termsAndConditions as string) ||
          "Payment is due upon receipt. Medical services are subject to GST at prevailing rates.",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
