import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole([...ADMIN_ROLES, "doctor", "therapist"]);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clinicId = await getClinicId();
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");

    // Get all patients who have WhatsApp messages
    const where: Record<string, unknown> = { patientId: { not: null } };
    if (clinicId) where.clinicId = clinicId;

    // Get latest message per patient
    const messages = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, whatsapp: true, phone: true } },
      },
    });

    // Group by patient, keep latest message
    const conversationMap = new Map<string, {
      patientId: string;
      patientName: string;
      whatsapp: string;
      lastMessage: string;
      lastMessageAt: Date;
      direction: string;
      unreadCount: number;
    }>();

    for (const msg of messages) {
      if (!msg.patientId || !msg.patient) continue;

      const patientName = `${msg.patient.firstName} ${msg.patient.lastName}`.trim();

      if (search) {
        const s = search.toLowerCase();
        if (!patientName.toLowerCase().includes(s) &&
            !(msg.patient.whatsapp || "").includes(s) &&
            !(msg.patient.phone || "").includes(s)) continue;
      }

      if (!conversationMap.has(msg.patientId)) {
        conversationMap.set(msg.patientId, {
          patientId: msg.patientId,
          patientName,
          whatsapp: msg.patient.whatsapp || msg.patient.phone || msg.from,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          direction: msg.direction,
          unreadCount: msg.direction === "inbound" && msg.status === "received" ? 1 : 0,
        });
      } else {
        const conv = conversationMap.get(msg.patientId)!;
        if (msg.direction === "inbound" && msg.status === "received") {
          conv.unreadCount++;
        }
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
