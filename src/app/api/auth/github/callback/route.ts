import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { isGitHubOAuthConfigured, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/constants";

export async function GET(request: NextRequest) {
  if (!isGitHubOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/auth?error=github_not_configured", request.url)
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("vl_gh_state")?.value;
  store.delete("vl_gh_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/auth?error=github_state_mismatch", request.url)
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(
      new URL("/auth?error=github_token_failed", request.url)
    );
  }

  const ghHeaders = {
    authorization: `Bearer ${tokenJson.access_token}`,
    accept: "application/vnd.github+json",
  };

  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers: ghHeaders }),
    fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
  ]);

  const profile = (await profileRes.json()) as {
    login?: string;
    name?: string;
    email?: string | null;
    bio?: string | null;
  };
  const emails = (await emailsRes.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const primaryEmail =
    (Array.isArray(emails)
      ? emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email
      : null) ||
    profile.email ||
    (profile.login ? `${profile.login}@users.noreply.github.com` : null);

  if (!primaryEmail || !profile.login) {
    return NextResponse.redirect(
      new URL("/auth?error=github_profile_incomplete", request.url)
    );
  }

  let user = await prisma.user.findUnique({
    where: { email: primaryEmail.toLowerCase() },
  });

  if (!user) {
    const baseHandle = slugify(profile.login) || "gh-user";
    const existingHandle = await prisma.user.findUnique({
      where: { handle: baseHandle },
    });
    user = await prisma.user.create({
      data: {
        email: primaryEmail.toLowerCase(),
        name: profile.name || profile.login,
        handle: existingHandle
          ? `${baseHandle}-${Math.floor(100 + Math.random() * 900)}`
          : baseHandle,
        role: "MAKER",
        verifiedIdentityType: "GITHUB",
        githubUsername: profile.login,
        bio: profile.bio || null,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        verifiedIdentityType: "GITHUB",
        githubUsername: profile.login,
      },
    });
  }

  await setSessionCookie(user.id);
  return NextResponse.redirect(new URL("/", request.url));
}
