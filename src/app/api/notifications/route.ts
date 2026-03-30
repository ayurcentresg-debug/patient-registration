import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/notifications - Return unread notifications (most recent 20)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {
      isRead: false,
    };

    if (branchId) {
      // Return notifications for this branch OR global (branchId = null)
      where.OR = [{ branchId }, { branchId: null }];
      delete where.isRead;
      where.AND = [{ isRead: false }];
    }

    // Build proper where clause
    const filterWhere = branchId
      ? {
          isRead: false,
          OR: [{ branchId }, { branchId: null }],
        }
      : { isRead: false };

    const notifications = await prisma.notification.findMany({
      where: filterWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.markAllRead) {
      // Mark all unread notifications as read
      const filter: Record<string, unknown> = { isRead: false };
      if (body.branchId) {
        filter.OR = [{ branchId: body.branchId }, { branchId: null }];
      }

      await prisma.notification.updateMany({
        where: filter,
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: body.ids },
        },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, message: `${body.ids.length} notification(s) marked as read` });
    }

    return NextResponse.json(
      { error: "Provide either { ids: [...] } or { markAllRead: true }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
