import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperAdminPayload } from "@/lib/super-admin-auth";

export async function GET(req: NextRequest) {
  try {
    const payload = await getSuperAdminPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinicId") || undefined;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // clinicId is nullable — build where with explicit undefined handling
    const whereClause: Record<string, unknown> = {};
    if (clinicId) whereClause.clinicId = clinicId;

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalMessages,
      inboundCount,
      outboundCount,
      deliveredCount,
      failedCount,
      todayMessages,
      thisMonthMessages,
      recentMessages,
      dailyTrendRaw,
    ] = await Promise.all([
      prisma.whatsAppMessage.count({ where: whereClause }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, direction: "inbound" } }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, direction: "outbound" } }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, status: "delivered" } }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, status: "failed" } }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, createdAt: { gte: today } } }),
      prisma.whatsAppMessage.count({ where: { ...whereClause, createdAt: { gte: thisMonthStart } } }),

      // Recent messages (last 20) — include patient relation only (no clinic FK)
      prisma.whatsAppMessage.findMany({
        where: whereClause,
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // For daily trend
      prisma.whatsAppMessage.findMany({
        where: { ...whereClause, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    // --- Per-clinic breakdown ---
    // groupBy on clinicId (nullable)
    const clinicGroupRaw = await prisma.whatsAppMessage.groupBy({
      by: ["clinicId"],
      ...(clinicId ? { where: { clinicId } } : {}),
      _count: { id: true },
      _max: { createdAt: true },
    });

    // Collect non-null clinic IDs
    const clinicIds = clinicGroupRaw
      .map((c) => c.clinicId)
      .filter((id): id is string => id !== null);

    const [clinics, directionCounts, uniquePatientCounts] = await Promise.all([
      clinicIds.length > 0
        ? prisma.clinic.findMany({
            where: { id: { in: clinicIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      prisma.whatsAppMessage.groupBy({
        by: ["clinicId", "direction"],
        ...(clinicId ? { where: { clinicId } } : {}),
        _count: { id: true },
      }),
      prisma.whatsAppMessage.groupBy({
        by: ["clinicId", "patientId"],
        ...(clinicId ? { where: { clinicId } } : {}),
      }),
    ]);

    const clinicNameMap = new Map(clinics.map((c) => [c.id, c.name]));

    const directionMap = new Map<string, { inbound: number; outbound: number }>();
    for (const row of directionCounts) {
      const key = row.clinicId || "_none";
      if (!directionMap.has(key)) directionMap.set(key, { inbound: 0, outbound: 0 });
      const entry = directionMap.get(key)!;
      if (row.direction === "inbound") entry.inbound = row._count.id;
      if (row.direction === "outbound") entry.outbound = row._count.id;
    }

    const uniquePatientsMap = new Map<string, Set<string>>();
    for (const row of uniquePatientCounts) {
      const key = row.clinicId || "_none";
      if (!uniquePatientsMap.has(key)) uniquePatientsMap.set(key, new Set());
      if (row.patientId) uniquePatientsMap.get(key)!.add(row.patientId);
    }

    const perClinicBreakdown = clinicGroupRaw.map((c) => {
      const key = c.clinicId || "_none";
      return {
        clinicId: c.clinicId,
        clinicName: c.clinicId ? (clinicNameMap.get(c.clinicId) || "Unknown") : "No Clinic",
        inbound: directionMap.get(key)?.inbound || 0,
        outbound: directionMap.get(key)?.outbound || 0,
        totalMessages: c._count.id,
        lastMessageAt: c._max.createdAt,
        uniquePatients: uniquePatientsMap.get(key)?.size || 0,
      };
    });

    // --- Enrich recent messages with clinic names ---
    const recentClinicIds = [...new Set(recentMessages.map((m) => m.clinicId).filter(Boolean))] as string[];
    const recentClinics =
      recentClinicIds.length > 0
        ? await prisma.clinic.findMany({
            where: { id: { in: recentClinicIds } },
            select: { id: true, name: true },
          })
        : [];
    const recentClinicMap = new Map(recentClinics.map((c) => [c.id, c.name]));

    const formattedRecentMessages = recentMessages.map((m) => ({
      id: m.id,
      clinicName: m.clinicId ? (recentClinicMap.get(m.clinicId) || "Unknown") : "No Clinic",
      patient: m.patient
        ? { id: m.patient.id, name: `${m.patient.firstName} ${m.patient.lastName}`.trim() }
        : null,
      direction: m.direction,
      from: m.from,
      to: m.to,
      body: m.body ? (m.body.length > 80 ? m.body.slice(0, 80) + "..." : m.body) : "",
      status: m.status,
      createdAt: m.createdAt,
    }));

    // --- Daily trend ---
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = dailyTrendRaw.filter((m) => {
        const d = new Date(m.createdAt);
        return d >= dayStart && d < dayEnd;
      }).length;

      dailyTrend.push({ date: dayStart.toISOString().split("T")[0], count });
    }

    return NextResponse.json({
      overview: {
        totalMessages,
        inbound: inboundCount,
        outbound: outboundCount,
        delivered: deliveredCount,
        failed: failedCount,
        todayMessages,
        thisMonthMessages,
      },
      perClinicBreakdown,
      recentMessages: formattedRecentMessages,
      dailyTrend,
    });
  } catch (error) {
    console.error("Super admin WhatsApp stats error:", error);
    return NextResponse.json(
      { error: "Failed to load WhatsApp stats" },
      { status: 500 }
    );
  }
}
