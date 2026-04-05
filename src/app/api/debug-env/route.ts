import { NextResponse } from "next/server";

export async function GET() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fallbackEmail = "ayurgate@gmail.com";
  const fallbackPassword = "Veda@2026";
  const usedEmail = email || fallbackEmail;
  const usedPassword = password || fallbackPassword;

  return NextResponse.json({
    envEmailSet: !!email,
    envEmailValue: email ? `${email.slice(0, 3)}***${email.slice(-4)}` : "NOT_SET",
    envPasswordSet: !!password,
    envPasswordLength: password ? password.length : 0,
    fallbackEmail,
    usedEmail: `${usedEmail.slice(0, 3)}***${usedEmail.slice(-4)}`,
    usedPasswordLength: usedPassword.length,
    testMatch: usedEmail === fallbackEmail && usedPassword === fallbackPassword,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    buildTime: new Date().toISOString(),
  });
}
