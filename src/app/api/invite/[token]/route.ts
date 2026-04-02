import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/invite/[token] — validate invite token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
      select: { id: true, name: true, email: true, role: true, inviteExpiresAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) < new Date()) {
      return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
    }

    return NextResponse.json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error("Failed to validate invite:", error);
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 });
  }
}

// POST /api/invite/[token] — set password and activate account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/invite", {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { token } = await params;
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) < new Date()) {
      return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
    }

    const hashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        isActive: true,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    return NextResponse.json({ message: "Account activated successfully" });
  } catch (error) {
    console.error("Failed to accept invite:", error);
    return NextResponse.json({ error: "Failed to activate account" }, { status: 500 });
  }
}
