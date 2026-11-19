import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { isGitHubOAuthConfigured } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!isGitHubOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/auth?error=github_not_configured", request.url)
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("vl_gh_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const appUrl = (process.env.APP_URL || request.nextUrl.origin).replace(
    /\/+$/,
    ""
  );
  const redirectUri = `${appUrl}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
}
