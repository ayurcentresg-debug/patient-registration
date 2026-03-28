import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith("AC")) {
    return null;
  }
  return twilio(sid, token);
}

export async function sendWhatsApp({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  const client = getClient();
  if (!client) {
    console.log("[WhatsApp] Twilio not configured. Message:", message);
    return { sid: "mock-wa-" + Date.now() };
  }
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
    to: `whatsapp:${to}`,
  });
  return result;
}
