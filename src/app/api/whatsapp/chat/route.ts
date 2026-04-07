import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";

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
    const { patientId, to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 });
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    if (!twilioSid || !twilioToken || !twilioSid.startsWith("AC")) {
      // Save as mock if Twilio not configured
      const msg = await prisma.whatsAppMessage.create({
        data: {
          clinicId,
          patientId: patientId || null,
          direction: "outbound",
          from: twilioFrom.replace("whatsapp:", ""),
          to: to.replace("whatsapp:", ""),
          body: message,
          status: "sent",
          twilioSid: `mock_${Date.now()}`,
        },
      });
      return NextResponse.json({ success: true, messageId: msg.id, provider: "mock" });
    }

    const twilio = require("twilio");
    const client = twilio(twilioSid, twilioToken);
    const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const twilioMsg = await client.messages.create({
      body: message,
      from: twilioFrom,
      to: toNumber,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com"}/api/whatsapp/webhook`,
    });

    const msg = await prisma.whatsAppMessage.create({
      data: {
        clinicId,
        patientId: patientId || null,
        direction: "outbound",
        from: twilioFrom.replace("whatsapp:", ""),
        to: to.replace("whatsapp:", ""),
        body: message,
        status: twilioMsg.status || "sent",
        twilioSid: twilioMsg.sid,
      },
    });

    return NextResponse.json({ success: true, messageId: msg.id, sid: twilioMsg.sid });
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
