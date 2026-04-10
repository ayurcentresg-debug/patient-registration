import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { serialize } from "cookie";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const mode = request.nextUrl.searchParams.get("state") || "login";
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=google_denied`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL(`/login?error=no_code`, request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL(`/login?error=token_failed`, request.url));
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=userinfo_failed`, request.url));
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL(`/login?error=no_email`, request.url));
    }

    // Check if user already exists (any clinic)
    const existingUser = await prisma.user.findFirst({
      where: { email: googleUser.email, role: "admin" },
    });

    // ── EXISTING USER → Log them in ──
    if (existingUser && existingUser.clinicId) {
      const token = await createToken({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        name: existingUser.name,
        clinicId: existingUser.clinicId,
        onboardingComplete: true,
      });

      const cookie = serialize("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      // Update last login
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastLogin: new Date() },
      });

      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      response.headers.set("Set-Cookie", cookie);
      return response;
    }

    // ── NEW USER (register mode) → Create clinic ──
    if (mode === "register" || mode === "login") {
      // For new Google users, redirect to a setup page to get clinic name
      // Store Google user info in a temporary cookie
      const googleData = JSON.stringify({
        email: googleUser.email,
        name: googleUser.name || googleUser.given_name || googleUser.email.split("@")[0],
        picture: googleUser.picture || "",
        googleId: googleUser.sub,
      });

      const tempCookie = serialize("google_pending", Buffer.from(googleData).toString("base64"), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10, // 10 minutes
      });

      const response = NextResponse.redirect(new URL("/google-setup", request.url));
      response.headers.set("Set-Cookie", tempCookie);
      return response;
    }

    return NextResponse.redirect(new URL("/login?error=unknown", request.url));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
