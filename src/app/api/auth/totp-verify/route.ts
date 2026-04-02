import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import * as OTPAuth from "otpauth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { code, action } = await req.json();
    // action: "enable" (during setup) or "login" (during login verification)

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.totpSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "AYUR GATE",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
    }

    // If this is the first-time enable, activate 2FA
    if (action === "enable" && !user.totpEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { totpEnabled: true },
      });
    }

    return NextResponse.json({ success: true, message: "Code verified" });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
