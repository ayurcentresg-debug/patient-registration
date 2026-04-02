import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith("AC")) {
    return null;
  }
  return twilio(sid, token);
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    // Twilio not configured — return mock success
    return { success: true, sid: "mock-sms-" + Date.now() };
  }
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER?.replace("whatsapp:", ""),
      to,
    });
    return { success: true, sid: result.sid };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS] Failed:", errMsg);
    return { success: false, error: errMsg };
  }
}
