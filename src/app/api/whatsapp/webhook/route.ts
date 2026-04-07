import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markAsRead, verifyWebhookSignature } from "@/lib/whatsapp";

/**
 * GET — Meta webhook verification
 * Meta sends: hub.mode=subscribe, hub.verify_token=<your token>, hub.challenge=<random string>
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Meta webhook for inbound messages + delivery status updates
 * Must always return 200 quickly (Meta retries on failure)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify signature in production (skip if WA_APP_SECRET not set)
    if (process.env.WA_APP_SECRET) {
      const signature = req.headers.get("x-hub-signature-256") || "";
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.warn("[WhatsApp] Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: "ok" });
    }

    // --- Inbound Messages ---
    if (value.messages) {
      for (const message of value.messages) {
        const from = message.from; // sender phone (digits only)
        const waMessageId = message.id;
        const type = message.type; // text, image, document, etc.

        // Extract message content based on type
        let messageBody = "";
        let mediaUrl: string | null = null;
        let mediaType: string | null = null;

        if (type === "text") {
          messageBody = message.text?.body || "";
        } else if (type === "image") {
          messageBody = message.image?.caption || "[Image]";
          mediaType = "image";
          // Media ID — you can download via GET /v21.0/{media-id}
          mediaUrl = message.image?.id || null;
        } else if (type === "document") {
          messageBody = message.document?.caption || `[Document: ${message.document?.filename || "file"}]`;
          mediaType = "document";
          mediaUrl = message.document?.id || null;
        } else if (type === "audio") {
          messageBody = "[Audio message]";
          mediaType = "audio";
          mediaUrl = message.audio?.id || null;
        } else if (type === "video") {
          messageBody = message.video?.caption || "[Video]";
          mediaType = "video";
          mediaUrl = message.video?.id || null;
        } else if (type === "location") {
          messageBody = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
        } else if (type === "contacts") {
          messageBody = "[Contact shared]";
        } else if (type === "reaction") {
          // Reactions — skip storing for now
          continue;
        } else {
          messageBody = `[${type}]`;
        }

        // Get contact name from Meta payload
        const contact = value.contacts?.find((c: { wa_id: string }) => c.wa_id === from);
        const contactName = contact?.profile?.name || null;

        // Find patient by WhatsApp/phone number
        const fromNormalized = from.startsWith("+") ? from : `+${from}`;
        const patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { whatsapp: from },
              { whatsapp: fromNormalized },
              { phone: from },
              { phone: fromNormalized },
            ],
          },
        });

        await prisma.whatsAppMessage.create({
          data: {
            clinicId: patient?.clinicId || null,
            patientId: patient?.id || null,
            direction: "inbound",
            from: fromNormalized,
            to: process.env.WA_PHONE_NUMBER || "",
            body: messageBody,
            mediaUrl,
            mediaType,
            status: "received",
            twilioSid: waMessageId, // reusing field for Meta message ID
          },
        });

        // Auto mark as read
        try {
          await markAsRead(waMessageId);
        } catch {
          // Non-critical — don't fail the webhook
        }

        console.log(`[WhatsApp] Inbound from ${from}${contactName ? ` (${contactName})` : ""}: ${messageBody.slice(0, 50)}`);
      }
    }

    // --- Delivery Status Updates ---
    if (value.statuses) {
      for (const status of value.statuses) {
        const waMessageId = status.id;
        const statusValue = status.status; // sent, delivered, read, failed

        const updateData: Record<string, unknown> = {
          status: statusValue,
        };

        if (statusValue === "failed" && status.errors?.length > 0) {
          updateData.errorCode = String(status.errors[0].code);
          updateData.errorMessage = status.errors[0].message || status.errors[0].title;
        }

        await prisma.whatsAppMessage.updateMany({
          where: { twilioSid: waMessageId },
          data: updateData,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    // Always return 200 — Meta retries on non-200
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
