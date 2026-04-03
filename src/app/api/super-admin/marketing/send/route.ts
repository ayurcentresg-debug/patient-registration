import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { sendEmail, sendMarketingEmail } from "@/lib/email";

/**
 * POST /api/super-admin/marketing/send
 * Send marketing emails to a list of recipients.
 */
export async function POST(req: NextRequest) {
  try {
    const authorized = await isSuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      to,
      subject,
      html,
      senderType,
    }: {
      to: string[];
      subject: string;
      html: string;
      senderType: "transactional" | "marketing";
    } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    if (!subject || !html) {
      return NextResponse.json(
        { error: "Subject and HTML body are required" },
        { status: 400 }
      );
    }

    const sendFn =
      senderType === "marketing" ? sendMarketingEmail : sendEmail;

    let successCount = 0;
    let failCount = 0;
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const email of to) {
      try {
        await sendFn({ to: email.trim(), subject, html });
        successCount++;
        results.push({ email, success: true });
        console.log(
          `[Marketing Send] Sent to ${email} via ${senderType}`
        );
      } catch (err) {
        failCount++;
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        results.push({ email, success: false, error: errorMsg });
        console.error(
          `[Marketing Send] Failed to send to ${email}:`,
          errorMsg
        );
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      total: to.length,
      results,
    });
  } catch (error) {
    console.error("[Marketing Send] Error:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}
