import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const COOKIE = "atoms_session";
const MAX_AGE = 60 * 60 * 24 * 30;

type Payload = { userId: string; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is missing");
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Payload;
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = encode({ userId, exp: Date.now() + MAX_AGE * 1000 });
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions());
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return decode(token)?.userId ?? null;
}

export async function requireUser(): Promise<{ id: string; email: string; name: string }> {
  const userId = await readSessionUserId();
  if (!userId) {
    throw new Error("unauthorized");
  }
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("unauthorized");
  return user;
}
