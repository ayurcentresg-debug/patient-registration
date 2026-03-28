import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    await prisma.user.update({
      where: { id: payload.userId },
      data: { totpSecret: null, totpEnabled: false },
    });

    return NextResponse.json({ success: true, message: "2FA disabled" });
  } catch (error) {
    console.error("TOTP disable error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
