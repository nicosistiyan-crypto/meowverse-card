import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { pushMessage, syncBorders } from "@/lib/notify";

const body = z.object({
  rowId: z.number().int().positive(),
  to: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/),
});
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("gift:" + user.id, 20, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Pilih kartu dan isi username penerima dengan benar.");
  if (p.data.to === user.username) return err("Tidak bisa mengirim kartu ke diri sendiri.");

  const { data: to } = await db.from("users").select("id, username, active").eq("username", p.data.to).maybeSingle();
  if (!to || !to.active) return err("Pemain dengan username itu tidak ditemukan.", 404);

  // The row must belong to the sender; gift_card re-checks this inside the transaction.
  const { data: row } = await db.from("user_cards").select("id, cards(name, tier)").eq("id", p.data.rowId).eq("user_id", user.id).maybeSingle();
  if (!row) return err("Kartu tidak ada di koleksimu.", 404);

  const { error } = await db.rpc("gift_card", { p_from: user.id, p_to: to.id, p_row: p.data.rowId });
  if (error) { console.error("gift_card rpc:", error); return err("Gagal mengirim kartu: " + error.message, 500); }
  const card: any = (row as any).cards;
  await pushMessage(to.id, "gift", `🎁 ${user.username} mengirim kartu ${card?.name ?? "kartu"} untukmu!`);
  await syncBorders(to.id);
  return NextResponse.json({ ok: true, to: to.username, name: card?.name ?? "Kartu" });
}
