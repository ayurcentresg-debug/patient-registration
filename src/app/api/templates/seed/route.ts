import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * POST /api/templates/seed
 * Seeds pre-built message templates for WhatsApp, SMS, and Email.
 * Skips templates that already exist (by name + channel).
 */

interface TemplateData {
  name: string;
  channel: "whatsapp" | "email" | "sms";
  category: string;
  subject?: string;
  body: string;
}

const DEFAULT_TEMPLATES: TemplateData[] = [
  // ─── Appointment Reminders ────────────────────────────────────────
  {
    name: "Appointment Reminder - Tomorrow",
    channel: "whatsapp",
    category: "appointment_reminder",
    body: `Hi {{patientName}},

This is a gentle reminder that you have an appointment tomorrow at *{{appointmentTime}}* with *{{doctorName}}* at {{clinicName}}.

📍 Please arrive 10 minutes early.
📋 Bring your ID and any previous reports.

To reschedule, please call us or reply to this message.

Thank you!
{{clinicName}}`,
  },
  {
    name: "Appointment Reminder - Today",
    channel: "whatsapp",
    category: "appointment_reminder",
    body: `Hi {{patientName}},

Just a quick reminder — your appointment is *today* at *{{appointmentTime}}* with *{{doctorName}}*.

We look forward to seeing you!
{{clinicName}}`,
  },
  {
    name: "Appointment Reminder - Tomorrow",
    channel: "sms",
    category: "appointment_reminder",
    body: `Reminder: {{patientName}}, your appointment is tomorrow at {{appointmentTime}} with {{doctorName}} at {{clinicName}}. Please arrive 10 min early. Call us to reschedule.`,
  },
  {
    name: "Appointment Reminder",
    channel: "email",
    category: "appointment_reminder",
    subject: "Appointment Reminder - {{clinicName}}",
    body: `Dear {{patientName}},

This is a reminder for your upcoming appointment:

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Doctor: {{doctorName}}
Location: {{clinicName}}

Please arrive 10 minutes before your scheduled time. Kindly bring your ID and any previous medical reports.

If you need to reschedule, please contact us at your earliest convenience.

Warm regards,
{{clinicName}}`,
  },

  // ─── Appointment Confirmation ─────────────────────────────────────
  {
    name: "Appointment Confirmed",
    channel: "whatsapp",
    category: "appointment_reminder",
    body: `Hi {{patientName}},

Your appointment has been confirmed! ✅

📅 *{{appointmentDate}}* at *{{appointmentTime}}*
👨‍⚕️ *{{doctorName}}*
📍 {{clinicName}}

See you there!`,
  },
  {
    name: "Appointment Confirmed",
    channel: "sms",
    category: "appointment_reminder",
    body: `Confirmed: {{patientName}}, your appointment on {{appointmentDate}} at {{appointmentTime}} with {{doctorName}} at {{clinicName}}. See you there!`,
  },

  // ─── Follow Up ────────────────────────────────────────────────────
  {
    name: "Post-Treatment Follow Up",
    channel: "whatsapp",
    category: "follow_up",
    body: `Hi {{patientName}},

We hope you're feeling better after your recent visit! 🙏

This is a follow-up to check on your progress with *{{treatmentName}}*.

How are you feeling? Please let us know if you have any concerns or would like to schedule a follow-up appointment.

Take care,
{{clinicName}}`,
  },
  {
    name: "Post-Treatment Follow Up",
    channel: "email",
    category: "follow_up",
    subject: "How are you feeling? - Follow Up from {{clinicName}}",
    body: `Dear {{patientName}},

We hope this message finds you well. We wanted to follow up on your recent visit and check on your progress.

Treatment: {{treatmentName}}

Please don't hesitate to reach out if you have any questions or concerns about your treatment. We're here to help.

If you'd like to schedule a follow-up appointment, simply reply to this email or call us.

Wishing you good health,
{{clinicName}}`,
  },
  {
    name: "Follow Up - 1 Week",
    channel: "whatsapp",
    category: "follow_up",
    body: `Hi {{patientName}},

It's been a week since your visit. We'd love to hear how you're doing!

If you're experiencing any issues or need to schedule a follow-up, please don't hesitate to reach out.

Best wishes,
{{clinicName}}`,
  },

  // ─── Payment Reminders ────────────────────────────────────────────
  {
    name: "Payment Reminder",
    channel: "whatsapp",
    category: "payment_reminder",
    body: `Hi {{patientName}},

This is a friendly reminder about your pending payment of *${"$"}{{amount}}* for your recent visit at {{clinicName}}.

Please complete the payment at your earliest convenience. You can pay at the clinic or through our online payment portal.

If you've already made the payment, please disregard this message.

Thank you,
{{clinicName}}`,
  },
  {
    name: "Payment Reminder",
    channel: "sms",
    category: "payment_reminder",
    body: `Hi {{patientName}}, this is a reminder about your pending payment of ${"$"}{{amount}} at {{clinicName}}. Please settle at your earliest convenience. Thank you.`,
  },
  {
    name: "Payment Reminder",
    channel: "email",
    category: "payment_reminder",
    subject: "Payment Reminder - {{clinicName}}",
    body: `Dear {{patientName}},

This is a friendly reminder regarding your outstanding balance of ${"$"}{{amount}} for services rendered at {{clinicName}}.

Please arrange payment at your earliest convenience. You may pay at the clinic reception during business hours.

If you have already settled this payment, kindly disregard this message.

Thank you for your prompt attention to this matter.

Best regards,
{{clinicName}}`,
  },

  // ─── Medication ───────────────────────────────────────────────────
  {
    name: "Medication Reminder",
    channel: "whatsapp",
    category: "medication",
    body: `Hi {{patientName}},

Just a reminder to take your prescribed medication as directed by {{doctorName}}.

💊 Please follow the dosage instructions carefully.
📝 If you experience any side effects, contact us immediately.

Stay healthy!
{{clinicName}}`,
  },
  {
    name: "Prescription Ready",
    channel: "whatsapp",
    category: "medication",
    body: `Hi {{patientName}},

Your prescription is ready for collection at {{clinicName}}. 💊

Please visit our pharmacy counter during operating hours to collect your medication.

Thank you,
{{clinicName}}`,
  },
  {
    name: "Prescription Ready",
    channel: "sms",
    category: "medication",
    body: `{{patientName}}, your prescription is ready for collection at {{clinicName}}. Please visit our pharmacy counter during operating hours.`,
  },

  // ─── Welcome ──────────────────────────────────────────────────────
  {
    name: "Welcome New Patient",
    channel: "whatsapp",
    category: "welcome",
    body: `Welcome to {{clinicName}}, {{patientName}}! 🙏

We're delighted to have you as our patient. Here's what you need to know:

📍 Our clinic hours: Mon-Sat, 9 AM - 6 PM
📞 For appointments, call or WhatsApp us
🏥 Please arrive 15 minutes early for your first visit

If you have any questions, feel free to reach out anytime.

Warm regards,
{{clinicName}}`,
  },
  {
    name: "Welcome New Patient",
    channel: "email",
    category: "welcome",
    subject: "Welcome to {{clinicName}}!",
    body: `Dear {{patientName}},

Welcome to {{clinicName}}! We are delighted to have you as our patient.

Here are a few things to help you get started:

- Clinic Hours: Monday to Saturday, 9:00 AM - 6:00 PM
- For appointments, call or WhatsApp us
- Please arrive 15 minutes early for your first visit
- Bring your ID and any relevant medical records

We look forward to providing you with the best care possible.

Warm regards,
{{clinicName}}`,
  },

  // ─── Birthday ─────────────────────────────────────────────────────
  {
    name: "Birthday Wishes",
    channel: "whatsapp",
    category: "birthday",
    body: `Happy Birthday, {{patientName}}! 🎂🎉

Wishing you a wonderful year ahead filled with good health and happiness!

As a birthday treat, enjoy a *10% discount* on your next consultation. Valid for 30 days.

With warm wishes,
{{clinicName}}`,
  },
  {
    name: "Birthday Wishes",
    channel: "sms",
    category: "birthday",
    body: `Happy Birthday {{patientName}}! Wishing you good health and happiness. Enjoy 10% off your next visit at {{clinicName}}. Valid 30 days. 🎂`,
  },
  {
    name: "Birthday Wishes",
    channel: "email",
    category: "birthday",
    subject: "Happy Birthday from {{clinicName}}! 🎂",
    body: `Dear {{patientName}},

Happy Birthday! On behalf of the entire team at {{clinicName}}, we wish you a wonderful day and a year ahead filled with good health and happiness.

As a special birthday treat, we'd like to offer you a 10% discount on your next consultation. This offer is valid for 30 days.

We truly value you as a patient and look forward to continuing to care for your health.

Warmest wishes,
{{clinicName}}`,
  },

  // ─── Custom / General ─────────────────────────────────────────────
  {
    name: "Clinic Closure Notice",
    channel: "whatsapp",
    category: "custom",
    body: `Dear {{patientName}},

Please be informed that {{clinicName}} will be *closed* on the following date(s):

📅 [Date(s)]

We apologize for any inconvenience. For urgent matters, please contact us via WhatsApp.

Regular hours will resume after the closure period.

Thank you for your understanding,
{{clinicName}}`,
  },
  {
    name: "Health Tips",
    channel: "whatsapp",
    category: "custom",
    body: `Hi {{patientName}},

Here's a wellness tip from {{clinicName}}:

🌿 [Health tip content]

Stay healthy and feel free to reach out if you have any health concerns!

Best wishes,
{{clinicName}}`,
  },
  {
    name: "Feedback Request",
    channel: "whatsapp",
    category: "custom",
    body: `Hi {{patientName}},

Thank you for visiting {{clinicName}}! We hope you had a good experience.

We'd love to hear your feedback — it helps us serve you better. Could you take a moment to share your thoughts?

⭐ Your feedback is valuable to us!

Thank you,
{{clinicName}}`,
  },
  {
    name: "Feedback Request",
    channel: "email",
    category: "custom",
    subject: "We'd love your feedback - {{clinicName}}",
    body: `Dear {{patientName}},

Thank you for your recent visit to {{clinicName}}. We hope you had a positive experience with us.

We continuously strive to improve our services, and your feedback is invaluable. We would greatly appreciate it if you could take a moment to share your thoughts about your visit.

Your feedback helps us provide better care for you and all our patients.

Thank you for your time,
{{clinicName}}`,
  },
];

export async function POST() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    let created = 0;
    let skipped = 0;

    for (const tpl of DEFAULT_TEMPLATES) {
      // Check if template already exists (by name + channel)
      const existing = await db.messageTemplate.findFirst({
        where: { name: tpl.name, channel: tpl.channel },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.messageTemplate.create({
        data: {
          name: tpl.name,
          channel: tpl.channel,
          category: tpl.category,
          subject: tpl.subject || null,
          body: tpl.body,
          isActive: true,
        },
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: DEFAULT_TEMPLATES.length,
      message: `Created ${created} templates, skipped ${skipped} (already exist)`,
    });
  } catch (error) {
    console.error("[Templates Seed] Error:", error);
    return NextResponse.json({ error: "Failed to seed templates" }, { status: 500 });
  }
}
