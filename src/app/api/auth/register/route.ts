import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, limited, roleFor } from "@/lib/auth";
import { credentials } from "@/lib/validation";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited("reg:" + ip, 5)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = credentials.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { username, password } = parsed.data;

  const { data: user, error } = await db
    .from("users")
    .insert({ username, password_hash: await bcrypt.hash(password, 12), role: roleFor(username) })
    .select("id")
    .single();
  if (error?.code === "23505") return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  if (error || !user) return NextResponse.json({ error: "Something went wrong." }, { status: 500 });

  await db.from("profiles").insert({ user_id: user.id });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
