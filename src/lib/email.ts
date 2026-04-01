import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Email provider strategy:
 *  1. If RESEND_API_KEY is set → use Resend (recommended for production)
 *  2. Otherwise fall back to SMTP/nodemailer (Gmail, etc.)
 */

// ── Resend client (lazy) ────────────────────────────────────────────────
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

// ── SMTP fallback (lazy) ───────────────────────────────────────────────
let _transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST) return null;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    family: 4, // Force IPv4 — Railway containers can't route IPv6
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as nodemailer.TransportOptions);
  return _transporter;
}

// ── Default sender ─────────────────────────────────────────────────────
const DEFAULT_FROM = "AYUR GATE <info@ayurgate.com>";

// ── Unified send function ──────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const sender = from || process.env.EMAIL_FROM || DEFAULT_FROM;

  // Strategy 1: Resend
  const resend = getResend();
  if (resend) {
    const { data, error } = await resend.emails.send({
      from: sender,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Resend failed: ${error.message}`);
    }
    return { messageId: data?.id, provider: "resend" };
  }

  // Strategy 2: SMTP fallback
  const transporter = getTransporter();
  if (transporter) {
    const info = await transporter.sendMail({ from: sender, to, subject, html });
    return { messageId: info.messageId, provider: "smtp" };
  }

  // No provider configured
  console.warn("⚠️  No email provider configured (set RESEND_API_KEY or SMTP_HOST)");
  return { messageId: null, provider: "none" };
}
