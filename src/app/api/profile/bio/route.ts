import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const body = z.object({ bio: z.string().max(160) });
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bio maksimal 160 karakter." }, { status: 400 });
  const bio = p.data.bio.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  await db.from("profiles").upsert({ user_id: user.id, bio: bio || null, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
