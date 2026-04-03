import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { logAudit } from "@/lib/audit";

// GET /api/settings - Fetch clinic settings
export async function GET() {
  try {
    const clinicId = await getClinicId();

    // Try to find settings by clinicId first, then fall back to any existing settings
    let settings = clinicId
      ? await prisma.clinicSettings.findUnique({ where: { clinicId } })
      : await prisma.clinicSettings.findFirst();

    if (!settings) {
      // Create default settings
      settings = await prisma.clinicSettings.create({
        data: {
          clinicId: clinicId || null,
          clinicName: "Ayur Centre Pte. Ltd.",
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
    }

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
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
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

    // Find existing settings
    let settings = clinicId
      ? await prisma.clinicSettings.findUnique({ where: { clinicId } })
      : await prisma.clinicSettings.findFirst();

    if (settings) {
      settings = await prisma.clinicSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.clinicSettings.create({
        data: {
          clinicId: clinicId || null,
          clinicName: (updateData.clinicName as string) || "Ayur Centre Pte. Ltd.",
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
    }

    await logAudit({
      action: "update",
      entity: "settings",
      entityId: settings.id,
      details: { fieldsChanged: Object.keys(updateData) },
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
