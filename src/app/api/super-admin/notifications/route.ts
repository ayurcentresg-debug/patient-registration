import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { jwtVerify } from "jose";
import fs from "fs";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import path from "path";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const HISTORY_FILE = path.join(process.cwd(), "data", "notification-history.json");

function ensureDataDir() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readHistory() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveHistory(history: unknown[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function verifySuperAdmin(req: NextRequest) {
  const token = req.cookies.get("super_admin_token")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "super_admin";
  } catch {
    return false;
  }
}

/**
 * GET /api/super-admin/notifications
 * Returns notification history and available templates
 */
export async function GET(req: NextRequest) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = readHistory();

  // Get clinic stats for audience info
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true },
    include: { subscription: { select: { plan: true } } },
    orderBy: { name: "asc" },
  });

  const audienceStats = {
    total: clinics.length,
    trial: clinics.filter((c) => c.subscription?.plan === "trial").length,
    starter: clinics.filter((c) => c.subscription?.plan === "starter").length,
    professional: clinics.filter((c) => c.subscription?.plan === "professional").length,
    enterprise: clinics.filter((c) => c.subscription?.plan === "enterprise").length,
  };

  return NextResponse.json({
    history: history.slice(0, 50), // Last 50
    audienceStats,
    clinics: clinics.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      plan: c.subscription?.plan || "trial",
    })),
  });
}

/**
 * POST /api/super-admin/notifications
 * Send a notification to clinics
 */
export async function POST(req: NextRequest) {
  if (!(await verifySuperAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, subject, message, audience, clinicIds } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    // Get target clinics
    let targetClinics;
    if (audience === "specific" && clinicIds?.length > 0) {
      targetClinics = await prisma.clinic.findMany({
        where: { id: { in: clinicIds }, isActive: true },
      });
    } else if (audience === "all") {
      targetClinics = await prisma.clinic.findMany({ where: { isActive: true } });
    } else {
      // Filter by plan
      const clinics = await prisma.clinic.findMany({
        where: { isActive: true },
        include: { subscription: true },
      });
      targetClinics = clinics.filter((c) => c.subscription?.plan === audience);
    }

    if (targetClinics.length === 0) {
      return NextResponse.json({ error: "No clinics found for this audience" }, { status: 400 });
    }

    // Build email HTML
    const html = buildNotificationEmail(type, subject, message);

    // Send to all targets
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const clinic of targetClinics) {
      try {
        await sendEmail({ to: clinic.email, subject: `[AyurGate] ${subject}`, html });
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${clinic.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Save to history
    const history = readHistory();
    history.unshift({
      id: Date.now().toString(),
      type,
      subject,
      message,
      audience,
      sentTo: targetClinics.length,
      sent,
      failed,
      sentAt: new Date().toISOString(),
      clinicNames: targetClinics.map((c) => c.name),
    });
    saveHistory(history);

    await logSuperAdminAction({ action: "send_notification", entity: "notification", details: { subject, audience, type, sent, failed, total: targetClinics.length } });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: targetClinics.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}

function buildNotificationEmail(type: string, subject: string, message: string): string {
  const typeColors: Record<string, { bg: string; label: string; icon: string }> = {
    feature: { bg: "#d1fae5", label: "New Feature", icon: "🚀" },
    update: { bg: "#dbeafe", label: "System Update", icon: "🔄" },
    tip: { bg: "#fef3c7", label: "Tip", icon: "💡" },
    maintenance: { bg: "#fee2e2", label: "Maintenance", icon: "🔧" },
    announcement: { bg: "#e0e7ff", label: "Announcement", icon: "📢" },
  };

  const t = typeColors[type] || typeColors.announcement;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,#14532d,#2d6a4f);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
    <div style="font-size:18px;font-weight:700;color:white;">AyurGate</div>
  </div>
  <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <div style="display:inline-block;background:${t.bg};border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;margin-bottom:16px;">
      ${t.icon} ${t.label}
    </div>
    <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${subject}</h2>
    <div style="font-size:14px;color:#374151;line-height:1.7;">${message.replace(/\n/g, "<br>")}</div>
    <div style="margin-top:24px;">
      <a href="https://www.ayurgate.com/login" style="display:inline-block;background:#14532d;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">Open Dashboard</a>
    </div>
  </div>
  <div style="text-align:center;padding:16px 0;">
    <p style="font-size:11px;color:#9ca3af;">You received this because you're a clinic admin on AyurGate.</p>
  </div>
</div>
</body></html>`;
}
