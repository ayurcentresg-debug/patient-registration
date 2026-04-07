/**
 * Meta WhatsApp Cloud API Client
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";

function getConfig() {
  return {
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID || "",
    accessToken: process.env.WA_ACCESS_TOKEN || "",
    verifyToken: process.env.WA_VERIFY_TOKEN || "",
    appSecret: process.env.WA_APP_SECRET || "",
  };
}

export function isWhatsAppConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.phoneNumberId && cfg.accessToken);
}

async function callApi(endpoint: string, body: Record<string, unknown>) {
  const cfg = getConfig();
  const url = `${GRAPH_API}/${cfg.phoneNumberId}/${endpoint}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || `WhatsApp API error ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}

/** Send a free-form text message (only within 24-hour window) */
export async function sendTextMessage(to: string, text: string) {
  return callApi("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhone(to),
    type: "text",
    text: { body: text },
  });
}

/** Send a template message (required to initiate conversations outside 24h window) */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = "en",
  components?: Record<string, unknown>[]
) {
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components) template.components = components;

  return callApi("messages", {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "template",
    template,
  });
}

/** Send an image message */
export async function sendImageMessage(to: string, imageUrl: string, caption?: string) {
  return callApi("messages", {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

/** Send a document message */
export async function sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string) {
  return callApi("messages", {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "document",
    document: { link: documentUrl, filename, ...(caption ? { caption } : {}) },
  });
}

/** Mark a message as read (sends blue ticks to sender) */
export async function markAsRead(messageId: string) {
  return callApi("messages", {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

/** Verify webhook signature from Meta */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const cfg = getConfig();
  if (!cfg.appSecret || !signature) return false;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const expected = "sha256=" + crypto
    .createHmac("sha256", cfg.appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Legacy-compatible sendWhatsApp function used by existing routes
 * (appointments, communications, reminders, patients)
 * Falls back to console.log if Meta API not configured
 */
export async function sendWhatsApp({ to, message }: { to: string; message: string }) {
  if (!isWhatsAppConfigured()) {
    console.log(`[WhatsApp Mock] To: ${to} — ${message.slice(0, 80)}`);
    return { success: true, provider: "mock" };
  }

  try {
    const result = await sendTextMessage(to, message);
    return { success: true, messageId: result.messages?.[0]?.id, provider: "meta" };
  } catch (error) {
    console.error("[WhatsApp] Failed to send:", error);
    // Don't throw — existing callers don't expect exceptions from this
    return { success: false, error: error instanceof Error ? error.message : "Send failed" };
  }
}

/** Normalize phone to E.164 digits only (Meta expects no + prefix) */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
