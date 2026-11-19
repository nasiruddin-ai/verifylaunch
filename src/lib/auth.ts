import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "vl_session";
export const VIEWER_SEED_COOKIE_NAME = "vl_seed";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "live.com",
]);

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    "verifylaunch-fallback-dev-secret-change-me-in-production";
  return new TextEncoder().encode(raw);
}

export function isDevAuthEnabled(): boolean {
  return process.env.DEV_AUTH_MODE === "true";
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );
}

export function extractWorkDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1];
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = await verifySessionToken(token);
  if (!verified) return null;

  return prisma.user.findUnique({
    where: { id: verified.userId },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      role: true,
      verifiedIdentityType: true,
      githubUsername: true,
      workDomain: true,
      bio: true,
    },
  });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getViewerSeed(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VIEWER_SEED_COOKIE_NAME)?.value;
  if (existing) return existing;
  // Deterministic fallback per day if cookie isn't set yet (read-only during SSR)
  const dayBucket = new Date().toISOString().slice(0, 10);
  return `anon-${dayBucket}`;
}

export function getIdentityBadgeLabel(
  verifiedIdentityType: string,
  githubUsername?: string | null,
  workDomain?: string | null
): string {
  if (verifiedIdentityType === "GITHUB") {
    return githubUsername ? `GitHub · @${githubUsername}` : "Verified GitHub";
  }
  if (verifiedIdentityType === "WORK_EMAIL") {
    return workDomain ? `Work Email · ${workDomain}` : "Verified Work Email";
  }
  return "Member";
}
