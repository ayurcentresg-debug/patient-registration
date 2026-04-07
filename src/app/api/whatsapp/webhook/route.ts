import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Twilio sends webhooks as POST with form data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Optional: Validate Twilio signature in production
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const signature = request.headers.get("x-twilio-signature");
    // const url = request.url;
    // if (authToken && signature) {
    //   const twilio = require("twilio");
    //   const valid = twilio.validateRequest(authToken, signature, url, body);
    //   if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    // }

    const messageSid = body.MessageSid || body.SmsSid;
    const messageStatus = body.MessageStatus || body.SmsStatus;

    // STATUS UPDATE (delivery receipt)
    if (messageStatus && messageSid && !body.Body) {
      await prisma.whatsAppMessage.updateMany({
        where: { twilioSid: messageSid },
        data: {
          status: messageStatus,
          errorCode: body.ErrorCode || null,
          errorMessage: body.ErrorMessage || null,
        },
      });
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // INCOMING MESSAGE
    if (body.Body || body.MediaUrl0) {
      const from = (body.From || "").replace("whatsapp:", "");
      const to = (body.To || "").replace("whatsapp:", "");

      // Find patient by WhatsApp number
      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { whatsapp: from },
            { whatsapp: `+${from.replace("+", "")}` },
            { phone: from },
            { phone: `+${from.replace("+", "")}` },
          ],
        },
      });

      await prisma.whatsAppMessage.create({
        data: {
          clinicId: patient?.clinicId || null,
          patientId: patient?.id || null,
          direction: "inbound",
          from,
          to,
          body: body.Body || "",
          mediaUrl: body.MediaUrl0 || null,
          mediaType: body.MediaContentType0 || null,
          status: "received",
          twilioSid: messageSid || null,
        },
      });

      // Return empty TwiML response (no auto-reply)
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
      status: 200, // Always return 200 to Twilio
    });
  }
}

// GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "WhatsApp webhook active" });
}
