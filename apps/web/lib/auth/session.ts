/**
 * Custom session (magic-link table auth). Signed cookie, no Supabase Auth.
 * Requires SESSION_SECRET in env.
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "overlap_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set and at least 16 characters");
  }
  return secret;
}

function sign(value: string): string {
  const secret = getSecret();
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function verify(value: string, signature: string): boolean {
  const expected = sign(value);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

export function encodeSession(user: SessionUser): string {
  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function decodeSession(cookieValue: string): SessionUser | null {
  const dot = cookieValue.indexOf(".");
  if (dot === -1) return null;
  const b64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!verify(b64, sig)) return null;
  let payload: { userId: string; email: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
  return { id: payload.userId, email: payload.email };
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const value = encodeSession(user);
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

export async function getSessionCookie(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decodeSession(value);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
