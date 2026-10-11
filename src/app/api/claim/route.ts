import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { syncBorders } from "@/lib/notify";
import { BORDER_KEYS } from "@/lib/types";

const body = z.object({ border: z.enum(BORDER_KEYS as [string, ...string[]]) });
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("claim:" + user.id, 20, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Border tidak dikenal.");
  await syncBorders(user.id);   // makes sure everything the player qualifies for is unlocked first
  const { data, error } = await db.from("user_borders")
    .update({ claimed_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("border", p.data.border).is("claimed_at", null).select("border");
  if (error) { console.error("claim:", error); return err("Gagal mengklaim: " + error.message, 500); }
  if (!data?.length) return err("Border ini belum terbuka atau sudah diklaim.", 409);
  return NextResponse.json({ ok: true, border: p.data.border });
}
