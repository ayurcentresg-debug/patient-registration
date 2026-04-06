import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, getAuthPayload } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * GET /api/doctor/consult/[id]
 * Full patient context for a consultation — patient info, vitals, clinical notes, past appointments, prescriptions
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: appointmentId } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get appointment with patient
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!appointment.patient) {
      // Walk-in without patient record
      return NextResponse.json({
        appointment: {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          status: appointment.status,
          type: appointment.type,
          reason: appointment.reason,
          notes: appointment.notes,
          doctor: appointment.doctor,
          department: appointment.department,
          isWalkin: appointment.isWalkin,
          walkinName: appointment.walkinName,
          walkinPhone: appointment.walkinPhone,
        },
        patient: null,
        vitals: [],
        clinicalNotes: [],
        pastAppointments: [],
        prescriptions: [],
      });
    }

    const patientId = appointment.patient.id;

    // Fetch everything in parallel
    const [vitals, clinicalNotes, pastAppointments, prescriptions] = await Promise.all([
      // Recent vitals (last 10)
      db.vital.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
        take: 10,
      }),

      // Clinical notes (last 20)
      db.clinicalNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      // Past appointments (last 15, excluding current)
      db.appointment.findMany({
        where: { patientId, id: { not: appointmentId } },
        orderBy: { date: "desc" },
        take: 15,
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
          type: true,
          reason: true,
          notes: true,
          doctor: true,
          department: true,
        },
      }),

      // Prescriptions (last 10)
      db.prescription.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          items: { orderBy: { sequence: "asc" } },
        },
      }),
    ]);

    const p = appointment.patient;

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes,
        doctor: appointment.doctor,
        department: appointment.department,
        sessionPrice: appointment.sessionPrice,
        treatmentName: appointment.treatmentName,
        packageName: appointment.packageName,
      },
      patient: {
        id: p.id,
        patientIdNumber: p.patientIdNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: p.email,
        gender: p.gender,
        age: p.age,
        dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        medicalHistory: p.medicalHistory,
        medicalNotes: p.medicalNotes,
        occupation: p.occupation,
        address: p.address,
      },
      vitals,
      clinicalNotes,
      pastAppointments,
      prescriptions,
    });
  } catch (error) {
    console.error("Doctor consult GET error:", error);
    return NextResponse.json({ error: "Failed to load consultation data" }, { status: 500 });
  }
}

/**
 * PUT /api/doctor/consult/[id]
 * Complete a consultation — save vitals, notes, update appointment
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: appointmentId } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // ── Save Vitals ──────────────────────────────────────────────────
    if (action === "save_vitals") {
      const { vitals } = body;
      if (!appointment.patientId) {
        return NextResponse.json({ error: "Cannot save vitals for walk-in without patient record" }, { status: 400 });
      }

      const vital = await db.vital.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          date: new Date(),
          bloodPressureSys: vitals.bloodPressureSys ? parseInt(vitals.bloodPressureSys) : null,
          bloodPressureDia: vitals.bloodPressureDia ? parseInt(vitals.bloodPressureDia) : null,
          pulse: vitals.pulse ? parseInt(vitals.pulse) : null,
          temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
          weight: vitals.weight ? parseFloat(vitals.weight) : null,
          height: vitals.height ? parseFloat(vitals.height) : null,
          bmi: vitals.weight && vitals.height
            ? Math.round((parseFloat(vitals.weight) / ((parseFloat(vitals.height) / 100) ** 2)) * 10) / 10
            : null,
          oxygenSaturation: vitals.oxygenSaturation ? parseFloat(vitals.oxygenSaturation) : null,
          respiratoryRate: vitals.respiratoryRate ? parseInt(vitals.respiratoryRate) : null,
          notes: vitals.notes || null,
          recordedBy: payload.name as string || "Doctor",
        },
      });

      return NextResponse.json({ success: true, vital });
    }

    // ── Save Clinical Note ───────────────────────────────────────────
    if (action === "save_note") {
      const { note } = body;
      if (!appointment.patientId) {
        return NextResponse.json({ error: "Cannot save notes for walk-in without patient record" }, { status: 400 });
      }

      const clinicalNote = await db.clinicalNote.create({
        data: {
          patientId: appointment.patientId,
          type: note.type || "general",
          title: note.title || `Consultation - ${new Date().toLocaleDateString()}`,
          content: note.content,
          doctor: payload.name as string || "Doctor",
        },
      });

      return NextResponse.json({ success: true, clinicalNote });
    }

    // ── Quick Prescription ───────────────────────────────────────────
    if (action === "save_prescription") {
      const { prescription } = body;
      if (!appointment.patientId) {
        return NextResponse.json({ error: "Cannot save prescription for walk-in without patient record" }, { status: 400 });
      }

      // Generate prescription number
      const month = new Date().toISOString().slice(0, 7).replace("-", "");
      const count = await db.prescription.count({
        where: { prescriptionNo: { startsWith: `RX-${month}` } },
      });
      const prescriptionNo = `RX-${month}-${String(count + 1).padStart(4, "0")}`;

      const rx = await db.prescription.create({
        data: {
          patientId: appointment.patientId,
          doctorId: payload.userId as string,
          doctorName: payload.name as string || "Doctor",
          prescriptionNo,
          diagnosis: prescription.diagnosis || null,
          notes: prescription.notes || null,
          date: new Date(),
          status: "active",
          items: {
            create: (prescription.items || []).map((item: {
              medicineName: string;
              dosage: string;
              frequency: string;
              timing?: string;
              duration: string;
              quantity?: string;
              instructions?: string;
            }, idx: number) => ({
              medicineName: item.medicineName,
              dosage: item.dosage || "",
              frequency: item.frequency || "",
              timing: item.timing || null,
              duration: item.duration || "",
              quantity: item.quantity || null,
              instructions: item.instructions || null,
              sequence: idx + 1,
            })),
          },
        },
        include: { items: true },
      });

      return NextResponse.json({ success: true, prescription: rx });
    }

    // ── Complete Appointment ─────────────────────────────────────────
    if (action === "complete") {
      const { notes } = body;

      await db.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "completed",
          notes: notes || appointment.notes,
        },
      });

      return NextResponse.json({ success: true, message: "Appointment completed" });
    }

    // ── Update Appointment Status ────────────────────────────────────
    if (action === "update_status") {
      const { status } = body;
      await db.appointment.update({
        where: { id: appointmentId },
        data: { status },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Doctor consult PUT error:", error);
    return NextResponse.json({ error: "Failed to update consultation" }, { status: 500 });
  }
}
