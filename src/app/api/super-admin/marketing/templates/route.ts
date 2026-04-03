import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/super-admin/marketing/templates
 * Fetch all B2B marketing email templates.
 */
export async function GET() {
  try {
    const authorized = await isSuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.messageTemplate.findMany({
      where: {
        category: "marketing",
        channel: "email",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        body: true,
        category: true,
        channel: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[Marketing Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
