import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { getPlanLimits, getTrialDuration } from "@/lib/platform-settings";

/**
 * POST /api/super-admin/bulk
 * Bulk operations on multiple clinics
 *
 * Actions:
 *  - extend_trial: { clinicIds, days }
 *  - change_plan: { clinicIds, plan }
 *  - toggle_active: { clinicIds, active }
 *  - export_csv: {} (returns CSV of all clinics)
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, clinicIds, ...data } = body;

    // ── CSV Export (no clinicIds needed) ──────────────────────────────
    if (action === "export_csv") {
      const clinics = await prisma.clinic.findMany({
        include: { subscription: true },
        orderBy: { createdAt: "desc" },
      });

      const counts = await Promise.all(
        clinics.map(async (c) => {
          const [users, patients, appointments] = await Promise.all([
            prisma.user.count({ where: { clinicId: c.id } }),
            prisma.patient.count({ where: { clinicId: c.id } }),
            prisma.appointment.count({ where: { clinicId: c.id } }),
          ]);
          return { clinicId: c.id, users, patients, appointments };
        })
      );
      const countMap = Object.fromEntries(counts.map((c) => [c.clinicId, c]));

      const headers = [
        "Clinic Name", "Email", "Phone", "Country", "City",
        "Plan", "Status", "Trial Ends", "Max Users", "Max Patients",
        "Users", "Patients", "Appointments", "Registered",
      ];

      const rows = clinics.map((c) => {
        const sub = c.subscription;
        const ct = countMap[c.id] || { users: 0, patients: 0, appointments: 0 };
        return [
          `"${(c.name || "").replace(/"/g, '""')}"`,
          c.email,
          c.phone || "",
          c.country || "",
          c.city || "",
          sub?.plan || "",
          sub?.status || "",
          sub?.trialEndsAt ? new Date(sub.trialEndsAt).toISOString().split("T")[0] : "",
          sub?.maxUsers ?? "",
          sub?.maxPatients ?? "",
          ct.users,
          ct.patients,
          ct.appointments,
          new Date(c.createdAt).toISOString().split("T")[0],
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      await logSuperAdminAction({
        action: "bulk_export",
        entity: "clinic",
        details: { count: clinics.length },
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="clinics-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // ── Validate clinicIds for other actions ──────────────────────────
    if (!clinicIds || !Array.isArray(clinicIds) || clinicIds.length === 0) {
      return NextResponse.json({ error: "No clinics selected" }, { status: 400 });
    }

    const clinics = await prisma.clinic.findMany({
      where: { id: { in: clinicIds } },
      include: { subscription: true },
    });

    if (clinics.length === 0) {
      return NextResponse.json({ error: "No valid clinics found" }, { status: 404 });
    }

    const results: { clinicId: string; name: string; success: boolean; message: string }[] = [];

    // ── Bulk Extend Trial ────────────────────────────────────────────
    if (action === "extend_trial") {
      const days = parseInt(data.days);
      if (!days || days < 1 || days > 365) {
        return NextResponse.json({ error: "Days must be 1-365" }, { status: 400 });
      }

      for (const clinic of clinics) {
        try {
          if (!clinic.subscription) {
            const trialDays = await getTrialDuration();
            const trialLimits = (await getPlanLimits()).trial;
            await prisma.clinicSubscription.create({
              data: {
                clinicId: clinic.id,
                plan: "trial",
                status: "active",
                trialEndsAt: new Date(Date.now() + (days + trialDays) * 24 * 60 * 60 * 1000),
                maxUsers: trialLimits.maxUsers,
                maxPatients: trialLimits.maxPatients,
              },
            });
            results.push({ clinicId: clinic.id, name: clinic.name, success: true, message: `Trial created (+${days}d)` });
          } else {
            const currentEnd = clinic.subscription.trialEndsAt || new Date();
            const baseDate = new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
            const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

            await prisma.clinicSubscription.update({
              where: { id: clinic.subscription.id },
              data: { trialEndsAt: newEnd, status: "active", plan: "trial" },
            });
            results.push({ clinicId: clinic.id, name: clinic.name, success: true, message: `Extended to ${newEnd.toLocaleDateString()}` });
          }
        } catch {
          results.push({ clinicId: clinic.id, name: clinic.name, success: false, message: "Failed to extend" });
        }
      }

      await logSuperAdminAction({
        action: "bulk_extend_trial",
        entity: "clinic",
        details: { days, count: clinics.length, succeeded: results.filter((r) => r.success).length },
      });
    }

    // ── Bulk Change Plan ─────────────────────────────────────────────
    else if (action === "change_plan") {
      const { plan } = data;
      const allLimits = await getPlanLimits();
      const validPlans = ["trial", "starter", "professional", "enterprise"];

      if (!validPlans.includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      const limits = allLimits[plan as keyof typeof allLimits];

      for (const clinic of clinics) {
        try {
          if (!clinic.subscription) {
            await prisma.clinicSubscription.create({
              data: {
                clinicId: clinic.id,
                plan,
                status: "active",
                maxUsers: limits.maxUsers,
                maxPatients: limits.maxPatients,
                trialEndsAt: plan === "trial" ? new Date(Date.now() + (await getTrialDuration()) * 24 * 60 * 60 * 1000) : null,
              },
            });
          } else {
            await prisma.clinicSubscription.update({
              where: { id: clinic.subscription.id },
              data: {
                plan,
                status: "active",
                maxUsers: limits.maxUsers,
                maxPatients: limits.maxPatients,
              },
            });
          }
          results.push({ clinicId: clinic.id, name: clinic.name, success: true, message: `Changed to ${plan}` });
        } catch {
          results.push({ clinicId: clinic.id, name: clinic.name, success: false, message: "Failed to change plan" });
        }
      }

      await logSuperAdminAction({
        action: "bulk_change_plan",
        entity: "clinic",
        details: { plan, count: clinics.length, succeeded: results.filter((r) => r.success).length },
      });
    }

    // ── Bulk Toggle Active ───────────────────────────────────────────
    else if (action === "toggle_active") {
      const active = !!data.active;

      for (const clinic of clinics) {
        try {
          await prisma.clinic.update({
            where: { id: clinic.id },
            data: { isActive: active },
          });
          results.push({ clinicId: clinic.id, name: clinic.name, success: true, message: active ? "Activated" : "Deactivated" });
        } catch {
          results.push({ clinicId: clinic.id, name: clinic.name, success: false, message: "Failed to update" });
        }
      }

      await logSuperAdminAction({
        action: "bulk_toggle_active",
        entity: "clinic",
        details: { active, count: clinics.length, succeeded: results.filter((r) => r.success).length },
      });
    }

    else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${succeeded} of ${results.length} clinics updated${failed > 0 ? `, ${failed} failed` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 500 });
  }
}
