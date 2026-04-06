import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/public/feedback?token=xxx — Validate feedback token
 * POST /api/public/feedback — Submit feedback via token (no auth needed)
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const feedback = await prisma.feedback.findUnique({ where: { token } });
    if (!feedback) return NextResponse.json({ error: "Invalid feedback link" }, { status: 404 });
    if (feedback.tokenExpiresAt && new Date() > feedback.tokenExpiresAt) {
      return NextResponse.json({ error: "This feedback link has expired" }, { status: 410 });
    }
    if (feedback.rating > 0) {
      return NextResponse.json({ error: "Feedback already submitted", alreadySubmitted: true }, { status: 409 });
    }

    return NextResponse.json({
      id: feedback.id,
      patientName: feedback.patientName,
      doctorName: feedback.doctorName,
      clinicId: feedback.clinicId,
    });
  } catch (error) {
    console.error("Public feedback GET error:", error);
    return NextResponse.json({ error: "Failed to validate feedback link" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, rating, category, comment, tags } = body;

    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const feedback = await prisma.feedback.findUnique({ where: { token } });
    if (!feedback) return NextResponse.json({ error: "Invalid feedback link" }, { status: 404 });
    if (feedback.tokenExpiresAt && new Date() > feedback.tokenExpiresAt) {
      return NextResponse.json({ error: "This feedback link has expired" }, { status: 410 });
    }

    const db = feedback.clinicId ? getTenantPrisma(feedback.clinicId) : prisma;

    const updated = await db.feedback.update({
      where: { id: feedback.id },
      data: {
        rating,
        category: category || "general",
        comment: comment || null,
        tags: tags ? JSON.stringify(tags) : "[]",
        source: "email",
        token: null, // Clear token after use
        tokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("Public feedback POST error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
