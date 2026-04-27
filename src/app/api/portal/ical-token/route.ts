/**
 * Generate / view / revoke this user's personal iCal subscription token.
 *
 * GET    /api/portal/ical-token  → returns existing token + subscription URL
 * POST   /api/portal/ical-token  → generates a new token (revokes old)
 * DELETE /api/portal/ical-token  → revokes the token (calendar feed stops)
 *
 * The token is the secret in the URL — anyone with the URL can read this
 * doctor's appointments. Treat it like a private feed key.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";
import crypto from "crypto";

function buildUrl(token: string, base: string): string {
  return `${base}/api/portal/ical/${token}.ics`;
}

export async function GET(request: NextRequest) {
  const payload = await getAuthPayload();
  const userId = (payload as { userId?: string; sub?: string } | null)?.userId
              || (payload as { sub?: string } | null)?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, icalToken: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return NextResponse.json({
    hasToken: !!user.icalToken,
    url: user.icalToken ? buildUrl(user.icalToken, base) : null,
    role: user.role,
  });
}

export async function POST(request: NextRequest) {
  const payload = await getAuthPayload();
  const userId = (payload as { userId?: string; sub?: string } | null)?.userId
              || (payload as { sub?: string } | null)?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 32-byte random token, URL-safe
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { icalToken: token },
  });

  const base = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return NextResponse.json({
    ok: true,
    token,
    url: buildUrl(token, base),
    instructions: "Copy this URL and add it as a new calendar subscription in Google Calendar (Other calendars → From URL), Apple Calendar (File → New Calendar Subscription), or Outlook (Add Calendar → From Internet).",
  });
}

export async function DELETE() {
  const payload = await getAuthPayload();
  const userId = (payload as { userId?: string; sub?: string } | null)?.userId
              || (payload as { sub?: string } | null)?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { icalToken: null },
  });
  return NextResponse.json({ ok: true });
}
