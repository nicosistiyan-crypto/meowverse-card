import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { BORDER_KEYS } from "@/lib/types";

const body = z.object({ border: z.enum(BORDER_KEYS as [string, ...string[]]).nullable() });
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Equip a border you have CLAIMED, or pass null to take it off.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Border tidak dikenal.");
  if (p.data.border) {
    const { data } = await db.from("user_borders").select("border").eq("user_id", user.id).eq("border", p.data.border).not("claimed_at", "is", null).maybeSingle();
    if (!data) return err("Border ini belum kamu klaim.", 403);
  }
  const { error } = await db.from("profiles").upsert({ user_id: user.id, border: p.data.border, updated_at: new Date().toISOString() });
  if (error) { console.error("equip border:", error); return err("Gagal memasang border: " + error.message, 500); }
  return NextResponse.json({ ok: true, border: p.data.border });
}
