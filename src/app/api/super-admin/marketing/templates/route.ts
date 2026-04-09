import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin-auth";

/**
 * GET /api/super-admin/marketing/templates
 * Returns built-in B2B marketing email templates.
 */

const B2B_TEMPLATES = [
  {
    id: "b2b-cold-outreach",
    name: "B2B Cold Outreach - Clinic Owner",
    subject: "Still managing your clinic on paper? There's a better way",
    body: `Dear {{name}},\n\nRunning an Ayurveda clinic is hard enough without wrestling with spreadsheets, missed appointments, and billing headaches.\n\nAyurGate is an all-in-one clinic management platform built specifically for Ayurveda and traditional medicine practices. It handles:\n\n- Patient registration and medical records\n- Appointment scheduling with online booking\n- Billing, invoicing, and payment tracking\n- Inventory management for herbs and medicines\n- WhatsApp and email communications\n\nHundreds of practitioners across Singapore and Asia trust AyurGate to run their clinics more efficiently.\n\nWould you be open to a quick 15-minute demo to see how it could work for your practice?\n\nWarm regards,\nThe AyurGate Team\nhttps://ayurgate.com`,
  },
  {
    id: "b2b-free-trial",
    name: "B2B Free Trial Invitation",
    subject: "Try AyurGate free for 14 days — no credit card needed",
    body: `Dear {{name}},\n\nWe'd love to invite you to try AyurGate — the clinic management software built for Ayurveda practitioners — completely free for 14 days.\n\nHere's what you'll get during your trial:\n\n- Unlimited patient registrations\n- Appointment scheduling with reminders\n- Billing and invoice generation\n- Inventory tracking\n- WhatsApp and email patient communications\n- Detailed reports and analytics\n\nNo credit card required. No setup fees. Cancel anytime.\n\nStart your free trial today and see the difference in how you manage your practice.\n\nReady to get started? Reply to this email or visit https://ayurgate.com/register\n\nBest regards,\nThe AyurGate Team`,
  },
  {
    id: "b2b-pain-points",
    name: "B2B Pain Points & Features",
    subject: "5 clinic problems AyurGate solves instantly",
    body: `Dear {{name}},\n\nIf you're running an Ayurveda clinic, chances are you're dealing with at least one of these:\n\n1. Double-booked appointments — Our smart scheduling prevents overlaps and sends automatic reminders to reduce no-shows by up to 40%.\n\n2. Lost patient records — Digital records mean instant access to any patient's history, treatments, and prescriptions.\n\n3. Billing errors — Auto-generated invoices with GST, package tracking, and payment status at a glance.\n\n4. Stock surprises — Real-time inventory tracking with low-stock alerts so you never run out of key medicines.\n\n5. No patient follow-up — Automated WhatsApp and email follow-ups keep patients engaged and coming back.\n\nAyurGate was built by practitioners, for practitioners. Every feature solves a real problem we've seen in clinics just like yours.\n\nInterested in seeing it in action? Let's schedule a quick demo.\n\nBest regards,\nThe AyurGate Team\nhttps://ayurgate.com`,
  },
  {
    id: "b2b-case-study",
    name: "B2B Case Study - Success Story",
    subject: "How one clinic saved 10 hours per week with AyurGate",
    body: `Dear {{name}},\n\nWe recently spoke with a clinic owner who was spending over 2 hours every day on admin tasks — scheduling, billing, follow-ups, and inventory checks.\n\nAfter switching to AyurGate:\n\n- Appointment no-shows dropped by 35% (automated WhatsApp reminders)\n- Billing time reduced from 45 minutes to 5 minutes per day\n- Patient retention improved by 25% (automated follow-up messages)\n- Zero stockouts in 6 months (real-time inventory alerts)\n\nThe result? 10+ hours saved every week — time that now goes back into patient care.\n\nEvery Ayurveda clinic deserves tools that work as hard as you do. AyurGate is designed to be that tool.\n\nWant similar results for your practice? Let's talk.\n\nWarm regards,\nThe AyurGate Team\nhttps://ayurgate.com`,
  },
  {
    id: "b2b-pricing",
    name: "B2B Pricing & Plans",
    subject: "AyurGate plans start at just S$49/month",
    body: `Dear {{name}},\n\nGreat clinic software shouldn't break the bank. That's why AyurGate offers flexible plans for every practice size:\n\nSTARTER — S$49/month\n- Up to 500 patients\n- Appointment scheduling\n- Basic billing and invoicing\n- Email support\n\nPROFESSIONAL — S$99/month\n- Unlimited patients\n- Multi-doctor scheduling\n- Inventory management\n- WhatsApp and email communications\n- Priority support\n\nENTERPRISE — Custom pricing\n- Multi-branch management\n- Custom integrations\n- Dedicated account manager\n- On-site training\n\nAll plans include a 14-day free trial. No credit card required.\n\nWhich plan fits your practice? Reply to this email and we'll help you choose.\n\nBest regards,\nThe AyurGate Team\nhttps://ayurgate.com`,
  },
  {
    id: "b2b-webinar",
    name: "B2B Webinar & Demo Invite",
    subject: "Free webinar: Digitize your Ayurveda clinic in 30 minutes",
    body: `Dear {{name}},\n\nYou're invited to a free live webinar where we'll show you how to digitize your Ayurveda clinic operations in under 30 minutes.\n\nWhat you'll learn:\n\n- How to set up digital patient records and eliminate paperwork\n- Automating appointment reminders to reduce no-shows\n- Streamlining billing with auto-generated invoices\n- Using WhatsApp to boost patient engagement\n- Live Q&A with our product team\n\nDate: [Webinar Date]\nTime: [Webinar Time] SGT\nDuration: 30 minutes + Q&A\nCost: Free\n\nSpaces are limited. Reserve your spot today by replying to this email.\n\nCan't make it? We'll send you the recording afterward. Just let us know.\n\nSee you there!\nThe AyurGate Team\nhttps://ayurgate.com`,
  },
];

export async function GET() {
  try {
    const authorized = await isSuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ templates: B2B_TEMPLATES });
  } catch (error) {
    console.error("[Marketing Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
