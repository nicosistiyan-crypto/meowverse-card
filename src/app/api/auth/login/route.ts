import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, limited, roleFor } from "@/lib/auth";
import { credentials } from "@/lib/validation";
import { syncRewards } from "@/lib/notify";

// Compared against when the user does not exist, so timing does not reveal valid usernames.
const DUMMY = bcrypt.hashSync("not-a-real-password", 12);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited("login:" + ip)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = credentials.safeParse(await req.json().catch(() => null));
  const fail = () => NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  if (!parsed.success) return fail();
  const { username, password } = parsed.data;

  const { data: user, error: dbErr } = await db.from("users").select("id, password_hash, role, active").eq("username", username).maybeSingle();
  if (dbErr) { console.error("login db error:", dbErr); return NextResponse.json({ error: "Database error: " + dbErr.message + " (cek .env.local)" }, { status: 500 }); }
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY);
  if (!user || !ok) return fail();
  if (!user.active) return NextResponse.json({ error: "This account is disabled." }, { status: 403 });
  if (roleFor(username) === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN")
    await db.from("users").update({ role: "SUPER_ADMIN" }).eq("id", user.id);
  await createSession(user.id);
  await syncRewards(user.id);   // Hadiah Login 1.000 coin muncul di menu CLAIM
  return NextResponse.json({ ok: true });
}
