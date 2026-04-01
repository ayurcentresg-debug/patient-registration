import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

interface TimelineEvent {
  id: string;
  type: "appointment" | "note" | "document" | "communication" | "vital" | "invoice";
  date: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  icon: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);

    // Verify patient exists
    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Fetch all event sources in parallel
    const [appointments, clinicalNotes, documents, communications, vitals, invoices] =
      await Promise.all([
        db.appointment.findMany({
          where: { patientId: id },
          include: { doctorRef: true },
        }),
        db.clinicalNote.findMany({
          where: { patientId: id },
        }),
        db.document.findMany({
          where: { patientId: id },
        }),
        db.communication.findMany({
          where: { patientId: id },
        }),
        db.vital.findMany({
          where: { patientId: id },
        }),
        db.invoice.findMany({
          where: { patientId: id },
        }),
      ]);

    const events: TimelineEvent[] = [];

    // Map appointments
    for (const appt of appointments) {
      const doctorName = appt.doctorRef?.name || appt.doctor || "Unknown";
      events.push({
        id: appt.id,
        type: "appointment",
        date: appt.date.toISOString(),
        title: `Appointment - ${appt.type}`,
        description: `${doctorName} · ${appt.reason || "No reason specified"}`,
        metadata: {
          time: appt.time,
          status: appt.status,
          treatmentName: appt.treatmentName,
        },
        icon: "calendar",
      });
    }

    // Map clinical notes
    for (const note of clinicalNotes) {
      events.push({
        id: note.id,
        type: "note",
        date: note.createdAt.toISOString(),
        title: `${note.type}: ${note.title}`,
        description: note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content,
        metadata: {
          type: note.type,
          doctor: note.doctor,
        },
        icon: "file-text",
      });
    }

    // Map documents
    for (const doc of documents) {
      events.push({
        id: doc.id,
        type: "document",
        date: doc.uploadedAt.toISOString(),
        title: `Document: ${doc.fileName}`,
        description: `${doc.category} · ${doc.description || "No description"}`,
        metadata: {
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          category: doc.category,
        },
        icon: "paperclip",
      });
    }

    // Map communications
    for (const comm of communications) {
      events.push({
        id: comm.id,
        type: "communication",
        date: comm.sentAt.toISOString(),
        title: `${comm.type} sent`,
        description: comm.message.length > 100 ? comm.message.substring(0, 100) + "..." : comm.message,
        metadata: {
          type: comm.type,
          status: comm.status,
        },
        icon: "mail",
      });
    }

    // Map vitals
    for (const vital of vitals) {
      const parts: string[] = [];
      if (vital.bloodPressureSys != null && vital.bloodPressureDia != null) {
        parts.push(`BP: ${vital.bloodPressureSys}/${vital.bloodPressureDia}`);
      }
      if (vital.pulse != null) parts.push(`Pulse: ${vital.pulse}`);
      if (vital.temperature != null) parts.push(`Temp: ${vital.temperature}`);
      events.push({
        id: vital.id,
        type: "vital",
        date: vital.date.toISOString(),
        title: "Vitals recorded",
        description: parts.length > 0 ? parts.join(", ") : "Vitals recorded",
        metadata: {
          bloodPressureSys: vital.bloodPressureSys,
          bloodPressureDia: vital.bloodPressureDia,
          pulse: vital.pulse,
          temperature: vital.temperature,
          weight: vital.weight,
          height: vital.height,
          bmi: vital.bmi,
          oxygenSaturation: vital.oxygenSaturation,
          respiratoryRate: vital.respiratoryRate,
        },
        icon: "heart",
      });
    }

    // Map invoices
    for (const inv of invoices) {
      events.push({
        id: inv.id,
        type: "invoice",
        date: inv.date.toISOString(),
        title: `Invoice ${inv.invoiceNumber}`,
        description: `${inv.status} · S$${inv.totalAmount}`,
        metadata: {
          status: inv.status,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
        },
        icon: "receipt",
      });
    }

    // Sort by date descending and apply limit
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limited = events.slice(0, limit);

    return NextResponse.json(limited);
  } catch (error) {
    console.error("GET /api/patients/[id]/timeline error:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}
