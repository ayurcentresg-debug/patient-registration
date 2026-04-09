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

// ── Marketing SMTP (Gmail for bulk / marketing emails) ────────────────
let _marketingTransporter: nodemailer.Transporter | null = null;
function getMarketingTransporter(): nodemailer.Transporter | null {
  if (_marketingTransporter) return _marketingTransporter;
  if (!process.env.MARKETING_SMTP_HOST) return null;
  _marketingTransporter = nodemailer.createTransport({
    host: process.env.MARKETING_SMTP_HOST,
    port: Number(process.env.MARKETING_SMTP_PORT) || 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.MARKETING_SMTP_USER,
      pass: process.env.MARKETING_SMTP_PASS,
    },
  } as nodemailer.TransportOptions);
  return _marketingTransporter;
}

// ── Default senders ───────────────────────────────────────────────────
const DEFAULT_FROM = "AyurGate <info@ayurgate.com>";
const MARKETING_FROM =
  process.env.MARKETING_EMAIL_FROM || "AyurGate <info@ayurgate.com>";

// ── Unified send function (transactional) ─────────────────────────────
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

/**
 * Send a marketing email via SMTP (info@ayurgate.com).
 * Falls back to transactional sendEmail() if marketing SMTP is not configured.
 */
export async function sendMarketingEmail({
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
  const sender = from || MARKETING_FROM;

  // Strategy 1: Marketing SMTP (Gmail)
  const marketing = getMarketingTransporter();
  if (marketing) {
    try {
      const info = await marketing.sendMail({ from: sender, to, subject, html });
      return { messageId: info.messageId, provider: "marketing-smtp" };
    } catch (err) {
      console.warn("⚠️  Marketing SMTP failed, falling back to transactional:", err);
    }
  }

  // Fallback: use transactional sender (Resend → SMTP)
  console.warn("⚠️  Using transactional email as fallback for marketing");
  return sendEmail({ to, subject, html, from: sender });
}
