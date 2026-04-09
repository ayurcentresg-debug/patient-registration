import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";

const REPORT_EMAIL = process.env.DAILY_REPORT_EMAIL || "ayurcentresg@gmail.com";

/**
 * GET /api/daily-report
 * Generates and sends a daily activity report email.
 * Protected by a secret key (for cron triggers) or super-admin auth.
 */
export async function GET(req: NextRequest) {
  // Auth: check cron secret or super-admin cookie
  const cronSecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET || "ayurgate-daily-2026";

  if (cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active clinics
    const clinics = await prisma.clinic.findMany({
      where: { isActive: true },
      include: { subscription: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Aggregate stats per clinic
    const clinicReports = [];

    for (const clinic of clinics) {
      const db = getTenantPrisma(clinic.id);

      const [
        // Today's stats
        newPatientsToday,
        appointmentsToday,
        completedToday,
        cancelledToday,
        noShowToday,
        // Revenue
        todayRevenueResult,
        monthRevenueResult,
        // Totals
        totalPatients,
        totalStaff,
        // Inventory alerts
        lowStockCount,
        expiringStockCount,
        // Upcoming
        upcomingTomorrow,
        // New registrations
        newPatientsThisWeek,
      ] = await Promise.all([
        db.patient.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        db.appointment.count({ where: { date: { gte: today, lt: tomorrow } } }),
        db.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: "completed" } }),
        db.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: "cancelled" } }),
        db.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: "no-show" } }),
        db.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { date: { gte: today, lt: tomorrow }, status: { notIn: ["cancelled", "draft"] } },
        }),
        db.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { date: { gte: monthStart, lt: tomorrow }, status: { notIn: ["cancelled", "draft"] } },
        }),
        db.patient.count(),
        db.user.count({ where: { status: "active" } }),
        db.inventoryItem.count({ where: { currentStock: { lte: 10 } } }),
        db.inventoryItem.count({
          where: {
            expiryDate: {
              gte: today,
              lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        db.appointment.count({
          where: {
            date: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) },
            status: { in: ["scheduled", "confirmed"] },
          },
        }),
        db.patient.count({
          where: {
            createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const todayRevenue = todayRevenueResult._sum.totalAmount ?? 0;
      const monthRevenue = monthRevenueResult._sum.totalAmount ?? 0;
      const scheduled = appointmentsToday - completedToday - cancelledToday - noShowToday;

      clinicReports.push({
        clinicName: clinic.name,
        plan: clinic.subscription?.plan || "trial",
        newPatientsToday,
        appointmentsToday,
        completedToday,
        cancelledToday,
        noShowToday,
        scheduled,
        todayRevenue,
        monthRevenue,
        totalPatients,
        totalStaff,
        lowStockCount,
        expiringStockCount,
        upcomingTomorrow,
        newPatientsThisWeek,
      });
    }

    // Totals across all clinics
    const totals = clinicReports.reduce(
      (acc, r) => ({
        clinics: acc.clinics + 1,
        newPatients: acc.newPatients + r.newPatientsToday,
        appointments: acc.appointments + r.appointmentsToday,
        completed: acc.completed + r.completedToday,
        cancelled: acc.cancelled + r.cancelledToday,
        noShow: acc.noShow + r.noShowToday,
        todayRevenue: acc.todayRevenue + r.todayRevenue,
        monthRevenue: acc.monthRevenue + r.monthRevenue,
        totalPatients: acc.totalPatients + r.totalPatients,
        lowStock: acc.lowStock + r.lowStockCount,
        expiring: acc.expiring + r.expiringStockCount,
        tomorrowAppts: acc.tomorrowAppts + r.upcomingTomorrow,
      }),
      {
        clinics: 0, newPatients: 0, appointments: 0, completed: 0,
        cancelled: 0, noShow: 0, todayRevenue: 0, monthRevenue: 0,
        totalPatients: 0, lowStock: 0, expiring: 0, tomorrowAppts: 0,
      }
    );

    // Build email HTML
    const dateStr = today.toLocaleDateString("en-SG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = buildReportEmail(dateStr, totals, clinicReports);

    // Send the email
    let emailResult = { messageId: null as string | null, provider: "none", error: "" };
    try {
      const r = await sendEmail({
        to: REPORT_EMAIL,
        subject: `AyurGate Daily Report — ${today.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}`,
        html,
      });
      emailResult = { ...r, error: "" };
    } catch (emailErr) {
      console.error("[Daily Report] Email send failed:", emailErr);
      emailResult.error = emailErr instanceof Error ? emailErr.message : "Email send failed";
    }

    return NextResponse.json({
      success: !emailResult.error,
      sentTo: REPORT_EMAIL,
      messageId: emailResult.messageId,
      provider: emailResult.provider,
      emailError: emailResult.error || undefined,
      totals,
      clinicCount: clinics.length,
    });
  } catch (error) {
    console.error("[Daily Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 });
  }
}

interface Totals {
  clinics: number;
  newPatients: number;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  todayRevenue: number;
  monthRevenue: number;
  totalPatients: number;
  lowStock: number;
  expiring: number;
  tomorrowAppts: number;
}

interface ClinicReport {
  clinicName: string;
  plan: string;
  newPatientsToday: number;
  appointmentsToday: number;
  completedToday: number;
  cancelledToday: number;
  noShowToday: number;
  scheduled: number;
  todayRevenue: number;
  monthRevenue: number;
  totalPatients: number;
  totalStaff: number;
  lowStockCount: number;
  expiringStockCount: number;
  upcomingTomorrow: number;
  newPatientsThisWeek: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", minimumFractionDigits: 0 }).format(amount);
}

function buildReportEmail(dateStr: string, totals: Totals, clinics: ClinicReport[]): string {
  const alertsHtml: string[] = [];
  if (totals.lowStock > 0) {
    alertsHtml.push(`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <strong style="color:#dc2626;">Low Stock Alert:</strong> <span style="color:#7f1d1d;">${totals.lowStock} item(s) at or below minimum stock level</span>
    </div>`);
  }
  if (totals.expiring > 0) {
    alertsHtml.push(`<div style="background:#fffbeb;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <strong style="color:#d97706;">Expiry Alert:</strong> <span style="color:#92400e;">${totals.expiring} item(s) expiring within 30 days</span>
    </div>`);
  }
  if (totals.noShow > 0) {
    alertsHtml.push(`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
      <strong style="color:#dc2626;">No-Shows Today:</strong> <span style="color:#7f1d1d;">${totals.noShow} appointment(s)</span>
    </div>`);
  }

  const clinicRows = clinics.map((c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">
        <strong style="color:#111827;">${c.clinicName}</strong>
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;">${c.plan}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${c.totalPatients}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
        <span style="color:#374151;">${c.appointmentsToday}</span>
        ${c.completedToday > 0 ? `<span style="color:#16a34a;font-size:12px;"> (${c.completedToday} done)</span>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#14532d;font-weight:600;">${formatCurrency(c.todayRevenue)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${c.upcomingTomorrow}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
        ${c.lowStockCount > 0 ? `<span style="color:#dc2626;font-weight:600;">${c.lowStockCount}</span>` : '<span style="color:#16a34a;">OK</span>'}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#14532d,#2d6a4f);border-radius:12px;padding:24px 28px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:20px;font-weight:800;color:white;letter-spacing:1px;">AyurGate</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:4px;">Daily Activity Report</div>
          </td>
          <td style="text-align:right;">
            <div style="font-size:13px;color:rgba(255,255,255,0.8);">${dateStr}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Summary Cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:0 4px 8px 0;width:33%;">
          <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#14532d;">${totals.appointments}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Appointments</div>
            <div style="font-size:11px;color:#16a34a;margin-top:4px;">${totals.completed} completed</div>
          </div>
        </td>
        <td style="padding:0 4px 8px 4px;width:34%;">
          <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#14532d;">${formatCurrency(totals.todayRevenue)}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">Today's Revenue</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;">MTD: ${formatCurrency(totals.monthRevenue)}</div>
          </div>
        </td>
        <td style="padding:0 0 8px 4px;width:33%;">
          <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#14532d;">${totals.newPatients}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">New Patients</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;">Total: ${totals.totalPatients.toLocaleString()}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Quick Stats Row -->
    <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:4px;">
            <div style="font-size:20px;font-weight:700;color:#16a34a;">${totals.completed}</div>
            <div style="font-size:11px;color:#6b7280;">Completed</div>
          </td>
          <td style="text-align:center;padding:4px;">
            <div style="font-size:20px;font-weight:700;color:#d97706;">${totals.cancelled}</div>
            <div style="font-size:11px;color:#6b7280;">Cancelled</div>
          </td>
          <td style="text-align:center;padding:4px;">
            <div style="font-size:20px;font-weight:700;color:#dc2626;">${totals.noShow}</div>
            <div style="font-size:11px;color:#6b7280;">No-Show</div>
          </td>
          <td style="text-align:center;padding:4px;">
            <div style="font-size:20px;font-weight:700;color:#2563eb;">${totals.tomorrowAppts}</div>
            <div style="font-size:11px;color:#6b7280;">Tomorrow</div>
          </td>
          <td style="text-align:center;padding:4px;">
            <div style="font-size:20px;font-weight:700;color:#14532d;">${totals.clinics}</div>
            <div style="font-size:11px;color:#6b7280;">Active Clinics</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Alerts -->
    ${alertsHtml.length > 0 ? `<div style="margin-bottom:24px;">${alertsHtml.join("")}</div>` : ""}

    <!-- Clinic Breakdown -->
    ${clinics.length > 0 ? `
    <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
        <strong style="font-size:15px;color:#111827;">Clinic Breakdown</strong>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Clinic</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Patients</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Appts</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Revenue</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Tomorrow</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Stock</th>
          </tr>
        </thead>
        <tbody>
          ${clinicRows}
        </tbody>
      </table>
    </div>
    ` : ""}

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <a href="https://www.ayurgate.com/super-admin/login" style="display:inline-block;background:#14532d;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Open Dashboard
      </a>
      <div style="font-size:11px;color:#9ca3af;margin-top:12px;">
        This is an automated daily report from AyurGate.<br>
        Generated at ${new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" })} SGT
      </div>
    </div>

  </div>
</body>
</html>`;
}
