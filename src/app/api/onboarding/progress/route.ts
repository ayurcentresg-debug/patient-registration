import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * GET /api/onboarding/progress
 *
 * Auto-detects 8 activation milestones from real clinic data.
 * No manual tracking — every milestone is verified from the database.
 *
 * Milestones:
 *  1. Clinic profile completed (name + address/city + phone)
 *  2. Branch created (≥1 branch)
 *  3. Staff invited (≥1 non-admin user)
 *  4. Services configured (≥1 treatment)
 *  5. First patient added
 *  6. First appointment booked
 *  7. First invoice raised
 *  8. Reminders enabled (≥1 sent communication)
 */
export async function GET() {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getTenantPrisma(clinicId);

    // Run all checks in parallel
    const [
      clinic,
      branchCount,
      staffCount,
      treatmentCount,
      firstPatient,
      firstAppointment,
      firstInvoice,
      sentCommsCount,
    ] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      db.branch.count(),
      db.user.count({ where: { role: { not: "admin" }, status: "active" } }),
      db.treatment.count(),
      db.patient.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      db.appointment.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      db.invoice.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      db.communication.count({ where: { status: "sent" } }),
    ]);

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // Evaluate milestones
    const profileDone = !!(clinic.name && (clinic.address || clinic.city) && clinic.phone);
    const branchDone = branchCount > 0;
    const staffDone = staffCount > 0;
    const servicesDone = treatmentCount > 0;
    const patientDone = !!firstPatient;
    const appointmentDone = !!firstAppointment;
    const invoiceDone = !!firstInvoice;
    const remindersDone = sentCommsCount > 0;

    const milestones = [
      {
        key: "profile",
        label: "Complete clinic profile",
        description: "Add your clinic name, address, and contact details",
        done: profileDone,
        doneAt: profileDone ? clinic.updatedAt?.toISOString() : null,
        href: "/admin",
        cta: "Edit Profile",
      },
      {
        key: "branch",
        label: "Create a branch",
        description: "Set up at least one clinic branch or location",
        done: branchDone,
        doneAt: branchDone ? clinic.updatedAt?.toISOString() : null,
        href: "/admin",
        cta: "Add Branch",
        count: branchCount,
      },
      {
        key: "staff",
        label: "Invite your team",
        description: "Add doctors, therapists, or staff members",
        done: staffDone,
        doneAt: null,
        href: "/therapists/new",
        cta: "Invite Staff",
        count: staffCount,
      },
      {
        key: "services",
        label: "Configure services",
        description: "Add consultation types and treatment services",
        done: servicesDone,
        doneAt: null,
        href: "/treatments",
        cta: "Add Service",
        count: treatmentCount,
      },
      {
        key: "patient",
        label: "Add first patient",
        description: "Create your first patient record",
        done: patientDone,
        doneAt: firstPatient?.createdAt?.toISOString() || null,
        href: "/patients",
        cta: "Add Patient",
      },
      {
        key: "appointment",
        label: "Book first appointment",
        description: "Schedule your first patient appointment",
        done: appointmentDone,
        doneAt: firstAppointment?.createdAt?.toISOString() || null,
        href: "/appointments/new",
        cta: "Book Appointment",
      },
      {
        key: "invoice",
        label: "Raise first invoice",
        description: "Generate your first invoice from a consultation",
        done: invoiceDone,
        doneAt: firstInvoice?.createdAt?.toISOString() || null,
        href: "/billing",
        cta: "Create Invoice",
      },
      {
        key: "reminders",
        label: "Enable reminders",
        description: "Send your first appointment reminder via email or WhatsApp",
        done: remindersDone,
        doneAt: null,
        href: "/communications",
        cta: "Set Up Reminders",
        count: sentCommsCount,
      },
    ];

    const completedSteps = milestones.filter((m) => m.done).length;
    const totalSteps = milestones.length;
    const isActivated = completedSteps === totalSteps;

    // Find next action (first incomplete milestone)
    const nextAction = milestones.find((m) => !m.done) || null;

    // Persist progress
    await prisma.onboardingProgress.upsert({
      where: { clinicId },
      create: {
        clinicId,
        completedSteps,
        profileCompletedAt: profileDone ? new Date() : null,
        branchCreatedAt: branchDone ? new Date() : null,
        staffInvitedAt: staffDone ? new Date() : null,
        servicesConfiguredAt: servicesDone ? new Date() : null,
        firstPatientAt: firstPatient?.createdAt || null,
        firstAppointmentAt: firstAppointment?.createdAt || null,
        firstInvoiceAt: firstInvoice?.createdAt || null,
        remindersEnabledAt: remindersDone ? new Date() : null,
        activatedAt: isActivated ? new Date() : null,
      },
      update: {
        completedSteps,
        profileCompletedAt: profileDone ? (undefined) : null,
        branchCreatedAt: branchDone ? (undefined) : null,
        staffInvitedAt: staffDone ? (undefined) : null,
        servicesConfiguredAt: servicesDone ? (undefined) : null,
        firstPatientAt: firstPatient?.createdAt || null,
        firstAppointmentAt: firstAppointment?.createdAt || null,
        firstInvoiceAt: firstInvoice?.createdAt || null,
        remindersEnabledAt: remindersDone ? (undefined) : null,
        activatedAt: isActivated ? (undefined) : null,
      },
    });

    return NextResponse.json({
      milestones,
      completedSteps,
      totalSteps,
      percent: Math.round((completedSteps / totalSteps) * 100),
      isActivated,
      nextAction,
      clinic: {
        name: clinic.name,
        createdAt: clinic.createdAt,
      },
    });
  } catch (error) {
    console.error("GET /api/onboarding/progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/progress
 * Only used to save clinicType selection
 */
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    await prisma.onboardingProgress.upsert({
      where: { clinicId },
      create: { clinicId, clinicType: body.clinicType || null },
      update: { clinicType: body.clinicType || undefined },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/onboarding/progress error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
