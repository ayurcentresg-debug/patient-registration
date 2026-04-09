/**
 * Branded HTML email templates for AyurGate
 * All emails use a consistent layout with green branding
 */

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#14532d;color:#fff;font-weight:800;font-size:14px;padding:8px 14px;border-radius:8px;letter-spacing:2px;">AG</div>
      <span style="display:inline-block;margin-left:8px;font-size:18px;font-weight:700;color:#14532d;letter-spacing:2px;vertical-align:middle;">AyurGate</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
      <h2 style="color:#14532d;font-size:20px;margin:0 0 20px 0;">${title}</h2>
      ${body}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;padding-top:16px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Sent by AyurGate &middot; Ayurveda Clinic Management</p>
      <p style="color:#d1d5db;font-size:11px;margin:4px 0 0 0;">www.ayurgate.com</p>
    </div>
  </div>
</body>
</html>`;
}

/** Password reset OTP email */
export function passwordResetEmail(name: string, otp: string): string {
  return layout("Password Reset", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Hi ${name},</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Use the code below to reset your password. It expires in 15 minutes.</p>
    <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:20px;text-align:center;margin:0 0 20px 0;">
      <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#14532d;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  `);
}

/** Appointment confirmation email */
export function appointmentConfirmationEmail(params: {
  patientName: string;
  date: string;
  time: string;
  doctor: string;
  type: string;
  notes?: string;
}): string {
  return layout("Appointment Confirmed", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Dear ${params.patientName},</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Your appointment has been confirmed. Here are the details:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:100px;">Date</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${params.date}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Time</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${params.time}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Doctor</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${params.doctor}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Type</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${params.type}</td>
      </tr>
      ${params.notes ? `<tr>
        <td style="padding:10px 12px;color:#6b7280;font-size:13px;">Notes</td>
        <td style="padding:10px 12px;color:#111827;font-size:14px;">${params.notes}</td>
      </tr>` : ""}
    </table>
    <p style="color:#6b7280;font-size:13px;margin:0;">Please arrive 10 minutes early. If you need to reschedule, contact the clinic.</p>
  `);
}

/** Appointment reminder email */
export function appointmentReminderEmail(params: {
  patientName: string;
  date: string;
  time: string;
  doctor: string;
}): string {
  return layout("Appointment Reminder", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Dear ${params.patientName},</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px 0;">This is a friendly reminder about your upcoming appointment:</p>
    <div style="background:#f0fdf4;border-radius:10px;padding:16px 20px;margin:0 0 20px 0;border-left:4px solid #14532d;">
      <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:#14532d;">${params.date} at ${params.time}</p>
      <p style="margin:0;font-size:14px;color:#374151;">with ${params.doctor}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">Please arrive 10 minutes early. If you need to reschedule, contact the clinic.</p>
  `);
}

/** Staff invite email */
export function staffInviteEmail(params: {
  staffName: string;
  role: string;
  clinicName: string;
  inviteUrl: string;
  tempPassword?: string;
}): string {
  const passwordBlock = params.tempPassword
    ? `<div style="background:#f0fdf4;border-radius:10px;padding:20px;margin:0 0 20px 0;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px 0;">Your temporary password:</p>
        <p style="font-size:20px;font-weight:700;color:#14532d;margin:0;letter-spacing:1px;">${params.tempPassword}</p>
      </div>`
    : "";

  return layout(`Welcome to ${params.clinicName}`, `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Hi ${params.staffName},</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
      You've been added as <strong>${params.role}</strong> at <strong>${params.clinicName}</strong>.
    </p>
    ${passwordBlock}
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Click the button below to set your password and activate your account:</p>
    <a href="${params.inviteUrl}" style="display:inline-block;background:#14532d;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">Accept Invite &amp; Sign In</a>
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0 0;">This link expires in 7 days. If you didn't expect this, ignore this email.</p>
  `);
}

/** Clinic registration notification (to admin) */
export function clinicRegistrationNotification(params: {
  clinicName: string;
  ownerName: string;
  email: string;
  country: string;
  clinicType?: string;
  practitionerCount?: string;
  referralSource?: string;
  termsAccepted?: boolean;
}): string {
  const row = (label: string, value: string, isLast = false) =>
    `<tr><td style="padding:8px 12px;${isLast ? "" : "border-bottom:1px solid #f3f4f6;"}color:#6b7280;font-size:13px;width:120px;">${label}</td><td style="padding:8px 12px;${isLast ? "" : "border-bottom:1px solid #f3f4f6;"}color:#111827;font-size:14px;font-weight:600;">${value}</td></tr>`;

  return layout("New Clinic Registration", `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">A new clinic has registered on AyurGate:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">
      ${row("Clinic", params.clinicName)}
      ${row("Owner", params.ownerName)}
      ${row("Email", params.email)}
      ${row("Country", params.country)}
      ${params.clinicType ? row("Clinic Type", params.clinicType) : ""}
      ${params.practitionerCount ? row("Team Size", params.practitionerCount) : ""}
      ${params.referralSource ? row("Referral", params.referralSource) : ""}
      ${row("Terms Accepted", params.termsAccepted ? "Yes" : '<span style="color:#dc2626;">No</span>', true)}
    </table>
  `);
}
