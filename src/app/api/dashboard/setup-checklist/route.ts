import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Run all count queries in parallel
    const [
      staffCount,
      salaryConfigCount,
      treatmentCount,
      payrollCount,
      patientCount,
      appointmentCount,
    ] = await Promise.all([
      db.user.count({ where: { role: { not: "admin" } } }),
      db.salaryConfig.count(),
      db.treatment.count(),
      db.payroll.count(),
      db.patient.count(),
      db.appointment.count(),
    ]);

    // Check booking readiness (uses main prisma, not tenant db)
    let bookingReady = false;
    let bookingSlug = "your-clinic";
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { slug: true },
      });
      bookingReady = !!clinic?.slug;
      if (clinic?.slug) {
        bookingSlug = clinic.slug;
      }
    }

    const steps = [
      {
        key: "staff",
        title: "Add Staff Members",
        description: "Add doctors, therapists, receptionists",
        link: "/admin?tab=staff",
        completed: staffCount > 0,
      },
      {
        key: "salary",
        title: "Setup Salary",
        description: "Configure salary for payroll",
        link: "/admin?tab=payroll",
        completed: salaryConfigCount > 0,
      },
      {
        key: "treatments",
        title: "Add Treatments",
        description: "Create your treatment menu",
        link: "/admin?tab=settings",
        completed: treatmentCount > 0,
      },
      {
        key: "booking",
        title: "Online Booking Ready",
        description: "Public booking page for patients",
        link: `/book/${bookingSlug}`,
        completed: bookingReady,
      },
      {
        key: "payroll",
        title: "Run First Payroll",
        description: "Generate payslips for staff",
        link: "/admin?tab=payroll",
        completed: payrollCount > 0,
      },
      {
        key: "patient",
        title: "Register First Patient",
        description: "Add your first patient record",
        link: "/patients",
        completed: patientCount > 0,
      },
      {
        key: "appointment",
        title: "Book First Appointment",
        description: "Schedule an appointment",
        link: "/appointments",
        completed: appointmentCount > 0,
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;

    return NextResponse.json({
      steps,
      completedCount,
      totalCount,
      allComplete: completedCount === totalCount,
    });
  } catch (e) {
    console.error("Setup checklist error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
