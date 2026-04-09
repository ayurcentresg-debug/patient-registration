import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { getPlanLimits, getTrialDuration } from "@/lib/platform-settings";

/**
 * GET /api/super-admin/clinics/[id]
 * Full clinic detail with users, recent patients, appointments, revenue
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // Get users
    const users = await prisma.user.findMany({
      where: { clinicId: id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get counts
    const [patientCount, appointmentCount, todayAppointments, recentPatients] =
      await Promise.all([
        prisma.patient.count({ where: { clinicId: id } }),
        prisma.appointment.count({ where: { clinicId: id } }),
        prisma.appointment.count({
          where: {
            clinicId: id,
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        prisma.patient.findMany({
          where: { clinicId: id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Revenue (sum of completed appointment fees)
    const revenueData = await prisma.appointment.aggregate({
      where: { clinicId: id, status: "completed" },
      _sum: { sessionPrice: true },
      _count: true,
    });

    // Monthly appointments for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyAppointments = await prisma.appointment.groupBy({
      by: ["status"],
      where: {
        clinicId: id,
        date: { gte: sixMonthsAgo },
      },
      _count: true,
    });

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        country: clinic.country,
        zipCode: clinic.zipCode,
        website: clinic.website,
        currency: clinic.currency,
        timezone: clinic.timezone,
        isActive: clinic.isActive,
        onboardingComplete: clinic.onboardingComplete,
        emailVerified: clinic.emailVerified,
        clinicType: clinic.clinicType,
        practitionerCount: clinic.practitionerCount,
        referralSource: clinic.referralSource,
        termsAcceptedAt: clinic.termsAcceptedAt,
        createdAt: clinic.createdAt,
        updatedAt: clinic.updatedAt,
      },
      subscription: clinic.subscription
        ? {
            id: clinic.subscription.id,
            plan: clinic.subscription.plan,
            status: clinic.subscription.status,
            trialEndsAt: clinic.subscription.trialEndsAt,
            currentPeriodStart: clinic.subscription.currentPeriodStart,
            currentPeriodEnd: clinic.subscription.currentPeriodEnd,
            maxUsers: clinic.subscription.maxUsers,
            maxPatients: clinic.subscription.maxPatients,
            stripeCustomerId: clinic.subscription.stripeCustomerId,
            stripeSubscriptionId: clinic.subscription.stripeSubscriptionId,
            paymentMethod: clinic.subscription.paymentMethod,
            notes: clinic.subscription.notes,
            createdAt: clinic.subscription.createdAt,
          }
        : null,
      users,
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.isActive).length,
        totalPatients: patientCount,
        totalAppointments: appointmentCount,
        todayAppointments,
        completedAppointments: revenueData._count,
        totalRevenue: revenueData._sum.sessionPrice || 0,
        appointmentsByStatus: monthlyAppointments.map((m) => ({
          status: m.status,
          count: m._count,
        })),
      },
      recentPatients: recentPatients.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
        phone: p.phone,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching clinic detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch clinic" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super-admin/clinics/[id]
 * Update clinic details, subscription, or perform actions
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, ...data } = body;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // ── Action: Extend Trial ──────────────────────────────────────────
    if (action === "extend_trial") {
      const { days } = data;
      if (!days || days < 1 || days > 365) {
        return NextResponse.json(
          { error: "Days must be between 1 and 365" },
          { status: 400 }
        );
      }

      if (!clinic.subscription) {
        return NextResponse.json(
          { error: "Clinic has no subscription" },
          { status: 400 }
        );
      }

      const currentEnd = clinic.subscription.trialEndsAt || new Date();
      const baseDate =
        new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + days);

      await prisma.clinicSubscription.update({
        where: { id: clinic.subscription.id },
        data: {
          trialEndsAt: newEnd,
          status: "active",
          plan: "trial",
          notes: `Trial extended by ${days} days on ${new Date().toISOString().split("T")[0]}${clinic.subscription.notes ? ". " + clinic.subscription.notes : ""}`,
        },
      });

      await logSuperAdminAction({ action: "extend_trial", entity: "subscription", entityId: id, entityName: clinic.name, details: { days, newEnd: newEnd.toISOString() } });

      return NextResponse.json({
        success: true,
        message: `Trial extended by ${days} days until ${newEnd.toLocaleDateString()}`,
        trialEndsAt: newEnd,
      });
    }

    // ── Action: Change Plan ───────────────────────────────────────────
    if (action === "change_plan") {
      const { plan } = data;
      const allLimits = await getPlanLimits();
      const trialDays = await getTrialDuration();
      const PLAN_LIMITS: Record<
        string,
        { maxUsers: number; maxPatients: number }
      > = {
        trial: allLimits.trial,
        starter: allLimits.starter,
        professional: allLimits.professional,
        enterprise: allLimits.enterprise,
      };

      if (!PLAN_LIMITS[plan]) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      const limits = PLAN_LIMITS[plan];

      if (!clinic.subscription) {
        // Create subscription
        await prisma.clinicSubscription.create({
          data: {
            clinicId: id,
            plan,
            status: "active",
            maxUsers: limits.maxUsers,
            maxPatients: limits.maxPatients,
            trialEndsAt:
              plan === "trial"
                ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
                : null,
            notes: `Plan set to ${plan} by super admin on ${new Date().toISOString().split("T")[0]}`,
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
            notes: `Plan changed to ${plan} by super admin on ${new Date().toISOString().split("T")[0]}${clinic.subscription.notes ? ". " + clinic.subscription.notes : ""}`,
          },
        });
      }

      await logSuperAdminAction({ action: "change_plan", entity: "subscription", entityId: id, entityName: clinic.name, details: { from: clinic.subscription?.plan, to: plan } });

      return NextResponse.json({
        success: true,
        message: `Plan changed to ${plan}`,
      });
    }

    // ── Action: Toggle Active ─────────────────────────────────────────
    if (action === "toggle_active") {
      const newStatus = !clinic.isActive;
      await prisma.clinic.update({
        where: { id },
        data: { isActive: newStatus },
      });

      if (clinic.subscription) {
        await prisma.clinicSubscription.update({
          where: { id: clinic.subscription.id },
          data: {
            status: newStatus ? "active" : "suspended",
            notes: `${newStatus ? "Activated" : "Deactivated"} by super admin on ${new Date().toISOString().split("T")[0]}${clinic.subscription.notes ? ". " + clinic.subscription.notes : ""}`,
          },
        });
      }

      await logSuperAdminAction({ action: "toggle_active", entity: "clinic", entityId: id, entityName: clinic.name, details: { isActive: newStatus } });

      return NextResponse.json({
        success: true,
        message: `Clinic ${newStatus ? "activated" : "deactivated"}`,
        isActive: newStatus,
      });
    }

    // ── Action: Reset Admin Password ──────────────────────────────────
    if (action === "reset_password") {
      const { userId } = data;
      if (!userId) {
        return NextResponse.json(
          { error: "userId required" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: { id: userId, clinicId: id },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found in this clinic" },
          { status: 404 }
        );
      }

      // Generate a temporary password
      const tempPassword =
        "Temp" +
        Math.random().toString(36).slice(2, 8) +
        "!" +
        Math.floor(Math.random() * 100);

      // Hash it
      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.hash(tempPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      });

      await logSuperAdminAction({ action: "reset_password", entity: "user", entityId: userId, entityName: `${user.name} (${clinic.name})`, details: { userEmail: user.email, clinicId: id } });

      return NextResponse.json({
        success: true,
        message: `Password reset for ${user.name}`,
        tempPassword,
        userName: user.name,
        userEmail: user.email,
      });
    }

    // ── Action: Update Notes ──────────────────────────────────────────
    if (action === "update_notes") {
      const { notes } = data;
      if (clinic.subscription) {
        await prisma.clinicSubscription.update({
          where: { id: clinic.subscription.id },
          data: { notes: notes || null },
        });
      }
      await logSuperAdminAction({ action: "update_notes", entity: "clinic", entityId: id, entityName: clinic.name });

      return NextResponse.json({
        success: true,
        message: "Notes updated",
      });
    }

    // ── Default: Update clinic fields ─────────────────────────────────
    const allowedFields = [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "country",
      "zipCode",
    ];
    const updateData: Record<string, string> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.clinic.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({
        success: true,
        message: "Clinic updated",
      });
    }

    return NextResponse.json({ error: "No valid action or data" }, { status: 400 });
  } catch (error) {
    console.error("Error updating clinic:", error);
    return NextResponse.json(
      { error: "Failed to update clinic" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/clinics/[id]
 * Permanently delete a clinic and all its data
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // Delete all related data in order (child tables first)
    await prisma.$transaction(async (tx) => {
      // Delete audit logs
      await tx.auditLog.deleteMany({ where: { clinicId: id } });
      // Delete communications
      await tx.communication.deleteMany({ where: { clinicId: id } });
      // Delete payments
      await tx.payment.deleteMany({ where: { invoice: { clinicId: id } } });
      // Delete invoice items
      await tx.invoiceItem.deleteMany({ where: { invoice: { clinicId: id } } });
      // Delete invoices
      await tx.invoice.deleteMany({ where: { clinicId: id } });
      // Delete prescriptions
      await tx.prescription.deleteMany({ where: { clinicId: id } });
      // Delete vitals
      await tx.vital.deleteMany({ where: { clinicId: id } });
      // Delete clinical notes
      await tx.clinicalNote.deleteMany({ where: { clinicId: id } });
      // Delete appointments
      await tx.appointment.deleteMany({ where: { clinicId: id } });
      // Delete patients
      await tx.patient.deleteMany({ where: { clinicId: id } });
      // Delete stock transactions
      await tx.stockTransaction.deleteMany({ where: { clinicId: id } });
      // Delete inventory items
      await tx.inventoryItem.deleteMany({ where: { clinicId: id } });
      // Delete treatments
      await tx.treatment.deleteMany({ where: { clinicId: id } });
      // Delete users
      await tx.user.deleteMany({ where: { clinicId: id } });
      // Delete subscription
      await tx.clinicSubscription.deleteMany({ where: { clinicId: id } });
      // Delete clinic settings
      await tx.clinicSettings.deleteMany({ where: { clinicId: id } });
      // Delete the clinic itself
      await tx.clinic.delete({ where: { id } });
    });

    await logSuperAdminAction({
      action: "delete_clinic",
      entity: "clinic",
      entityId: id,
      entityName: `${clinic.name} (${clinic.email})`,
      details: { permanently_deleted: true },
    });

    return NextResponse.json({
      success: true,
      message: `Clinic "${clinic.name}" and all its data have been permanently deleted`,
    });
  } catch (error) {
    console.error("Error deleting clinic:", error);
    return NextResponse.json(
      { error: "Failed to delete clinic. Some related records may have foreign key constraints." },
      { status: 500 }
    );
  }
}
