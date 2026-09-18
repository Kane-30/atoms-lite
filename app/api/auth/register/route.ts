import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning({ id: users.id, email: users.email });

  await createSession(user.id);
  return NextResponse.json({ user });
}
