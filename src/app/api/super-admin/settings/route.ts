import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { getPlatformSettings } from "@/lib/platform-settings";
import { logSuperAdminAction } from "@/lib/super-admin-audit";

const SETTINGS_ID = "platform_settings";

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { section, ...data } = body;

    // Validate based on section
    if (section === "trial") {
      const { trialDurationDays, trialMaxUsers, trialMaxPatients } = data;
      if (trialDurationDays < 1 || trialDurationDays > 365)
        return NextResponse.json({ error: "Trial duration must be 1-365 days" }, { status: 400 });
      if (trialMaxUsers < 1 || trialMaxUsers > 100)
        return NextResponse.json({ error: "Max users must be 1-100" }, { status: 400 });
      if (trialMaxPatients < 1 || trialMaxPatients > 999999)
        return NextResponse.json({ error: "Max patients must be 1-999999" }, { status: 400 });

      await prisma.platformSettings.update({
        where: { id: SETTINGS_ID },
        data: { trialDurationDays, trialMaxUsers, trialMaxPatients },
      });
      await logSuperAdminAction({ action: "update_settings", entity: "system", details: { section: "trial", ...data } });
    }

    else if (section === "plans") {
      const allowed = [
        "starterMaxUsers", "starterMaxPatients",
        "proMaxUsers", "proMaxPatients",
        "enterpriseMaxUsers", "enterpriseMaxPatients",
      ];
      const updateData: Record<string, number> = {};
      for (const key of allowed) {
        if (data[key] !== undefined) updateData[key] = parseInt(data[key]);
      }
      await prisma.platformSettings.update({
        where: { id: SETTINGS_ID },
        data: updateData,
      });
      await logSuperAdminAction({ action: "update_settings", entity: "system", details: { section: "plans", ...updateData } });
    }

    else if (section === "pricing") {
      const allowed = [
        "starterMonthlyPrice", "starterAnnualPrice",
        "proMonthlyPrice", "proAnnualPrice",
        "enterpriseMonthlyPrice", "enterpriseAnnualPrice",
      ];
      const updateData: Record<string, number> = {};
      for (const key of allowed) {
        if (data[key] !== undefined) updateData[key] = Math.round(parseFloat(data[key]) * 100);
      }
      await prisma.platformSettings.update({
        where: { id: SETTINGS_ID },
        data: updateData,
      });
      await logSuperAdminAction({ action: "update_settings", entity: "system", details: { section: "pricing" } });
    }

    else if (section === "features") {
      const allowed = [
        "enableOnlineBooking", "enablePayroll", "enableInventory",
        "enablePackages", "enableReports", "enableMultiBranch",
        "enableCme", "enableWhatsApp", "enableSMS", "enableApiAccess", "maintenanceMode",
      ];
      const updateData: Record<string, boolean> = {};
      for (const key of allowed) {
        if (data[key] !== undefined) updateData[key] = !!data[key];
      }
      await prisma.platformSettings.update({
        where: { id: SETTINGS_ID },
        data: updateData,
      });
      await logSuperAdminAction({ action: "update_settings", entity: "system", details: { section: "features", changed: Object.keys(updateData) } });
    }

    else if (section === "branding") {
      const { platformName, supportEmail, supportPhone } = data;
      await prisma.platformSettings.update({
        where: { id: SETTINGS_ID },
        data: {
          ...(platformName !== undefined && { platformName }),
          ...(supportEmail !== undefined && { supportEmail }),
          ...(supportPhone !== undefined && { supportPhone }),
        },
      });
      await logSuperAdminAction({ action: "update_settings", entity: "system", details: { section: "branding" } });
    }

    else {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const updated = await getPlatformSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
