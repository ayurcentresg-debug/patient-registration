import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google/pending
 * Returns whether a google_pending cookie exists and, if so, the name/email
 * Google returned. Used by /google-setup to pre-fill the form and detect
 * expired sessions before the user wastes time filling out the form.
 *
 * Public route (listed under /api/auth/google in middleware PUBLIC_PATHS).
 */
export async function GET(request: NextRequest) {
  const pending = request.cookies.get("google_pending")?.value;
  if (!pending) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
  try {
    const data = JSON.parse(Buffer.from(pending, "base64").toString()) as {
      email?: string;
      name?: string;
    };
    if (!data.email) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
    return NextResponse.json({
      valid: true,
      email: data.email,
      name: data.name || "",
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
