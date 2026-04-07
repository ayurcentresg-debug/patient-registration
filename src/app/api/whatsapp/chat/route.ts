import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { sendTextMessage, sendTemplateMessage, isWhatsAppConfigured } from "@/lib/whatsapp";

// GET /api/whatsapp/chat?patientId=xxx — get conversation history
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole([...ADMIN_ROLES, "doctor", "therapist"]);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clinicId = await getClinicId();
    const { searchParams } = request.nextUrl;
    const patientId = searchParams.get("patientId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;

    const where: Record<string, unknown> = {};
    if (clinicId) where.clinicId = clinicId;
    if (patientId) where.patientId = patientId;

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, whatsapp: true, phone: true } },
        },
      }),
      prisma.whatsAppMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages: messages.reverse(), // chronological order
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch WhatsApp chat:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/whatsapp/chat — send a WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole([...ADMIN_ROLES, "doctor", "therapist"]);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const clinicId = await getClinicId();
    const { patientId, to, message, type, templateName, templateLang, templateComponents } = await request.json();

    if (!to || (!message && !templateName)) {
      return NextResponse.json({ error: "Phone number and message (or template) are required" }, { status: 400 });
    }

    const fromNumber = process.env.WA_PHONE_NUMBER || process.env.WA_PHONE_NUMBER_ID || "";

    // --- Mock mode if Meta WhatsApp not configured ---
    if (!isWhatsAppConfigured()) {
      const msg = await prisma.whatsAppMessage.create({
        data: {
          clinicId,
          patientId: patientId || null,
          direction: "outbound",
          from: fromNumber,
          to: to.replace(/[^0-9+]/g, ""),
          body: message || `[Template: ${templateName}]`,
          status: "sent",
          twilioSid: `mock_${Date.now()}`,
        },
      });
      return NextResponse.json({ success: true, messageId: msg.id, provider: "mock" });
    }

    // --- Send via Meta WhatsApp Cloud API ---
    let result;
    const sendType = type || (templateName ? "template" : "text");

    if (sendType === "template" && templateName) {
      result = await sendTemplateMessage(to, templateName, templateLang || "en", templateComponents);
    } else {
      result = await sendTextMessage(to, message);
    }

    const waMessageId = result.messages?.[0]?.id || null;

    const msg = await prisma.whatsAppMessage.create({
      data: {
        clinicId,
        patientId: patientId || null,
        direction: "outbound",
        from: fromNumber,
        to: to.replace(/[^0-9+]/g, ""),
        body: message || `[Template: ${templateName}]`,
        status: result.messages?.[0]?.message_status || "sent",
        twilioSid: waMessageId, // reusing field for Meta message ID
      },
    });

    return NextResponse.json({ success: true, messageId: msg.id, waMessageId });
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
