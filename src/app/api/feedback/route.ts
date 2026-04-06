import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/feedback — List feedback for the clinic (admin view)
 */
export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const url = req.nextUrl;

    const rating = url.searchParams.get("rating");
    const doctorId = url.searchParams.get("doctorId");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (rating) where.rating = parseInt(rating);
    if (doctorId) where.doctorId = doctorId;
    if (category && category !== "all") where.category = category;
    if (status && status !== "all") where.status = status;

    const [feedbacks, stats] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.feedback.groupBy({
        by: ["rating"],
        _count: { rating: true },
      }),
    ]);

    // Calculate averages
    const total = feedbacks.length;
    const avgRating = total > 0 ? feedbacks.reduce((s, f) => s + f.rating, 0) / total : 0;
    const distribution = [1, 2, 3, 4, 5].map(r => ({
      rating: r,
      count: stats.find(s => s.rating === r)?._count?.rating || 0,
    }));

    // NPS approximation: 5=promoter, 4=passive, 1-3=detractor
    const promoters = feedbacks.filter(f => f.rating === 5).length;
    const detractors = feedbacks.filter(f => f.rating <= 3).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return NextResponse.json({
      feedbacks,
      stats: { total, avgRating: Math.round(avgRating * 10) / 10, nps, distribution },
    });
  } catch (error) {
    console.error("Feedback list error:", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

/**
 * PUT /api/feedback — Respond to feedback (admin)
 */
export async function PUT(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const body = await req.json();
    const { id, response, status } = body;

    if (!id) return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (response !== undefined) {
      data.response = response;
      data.respondedAt = new Date();
      data.respondedBy = "Admin";
    }
    if (status) data.status = status;

    const feedback = await db.feedback.update({ where: { id }, data });
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Feedback update error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
