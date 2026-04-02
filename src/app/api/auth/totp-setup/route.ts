import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Generate a new TOTP secret
    const secret = new OTPAuth.Secret({ size: 20 });

    const totp = new OTPAuth.TOTP({
      issuer: "AYUR GATE",
      label: payload.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();

    // Save secret to user (not yet enabled — needs verification first)
    await prisma.user.update({
      where: { id: payload.userId },
      data: { totpSecret: secret.base32 },
    });

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrDataUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
