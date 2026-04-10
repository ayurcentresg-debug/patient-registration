import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  // Pass "mode" param so callback knows if this is register or login
  const mode = request.nextUrl.searchParams.get("mode") || "login";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: mode, // "login" or "register"
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
