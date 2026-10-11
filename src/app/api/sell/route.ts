import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { SELL_PRICE, type TierKey } from "@/lib/types";

const body = z.object({ ids: z.array(z.number().int().positive()).min(1).max(300) });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("sell:" + user.id, 20, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Pilih 1 sampai 300 kartu untuk dijual.", 400);
  const ids = [...new Set(p.data.ids)];

  // The price comes from the card's tier in the database, never from the browser. Only the player's own copies are accepted.
  const { data, error } = await db.from("user_cards").select("id, cards(tier)").eq("user_id", user.id).in("id", ids);
  if (error) { console.error("sell read:", error); return err("Gagal membaca kartumu.", 500); }
  if ((data ?? []).length !== ids.length) return err("Sebagian kartu tidak ada di koleksimu (mungkin sudah terjual). Muat ulang halaman.", 409);
  let total = 0;
  for (const r of data as any[]) {
    const tier = (Array.isArray(r.cards) ? r.cards[0]?.tier : r.cards?.tier) as TierKey | undefined;
    if (!tier || !(tier in SELL_PRICE)) return err("Ada kartu yang tidak bisa dijual.", 400);
    total += SELL_PRICE[tier];
  }
  const { data: coins, error: e2 } = await db.rpc("sell_cards", { p_user: user.id, p_rows: ids, p_total: total });
  if (e2 || coins == null) {
    console.error("sell_cards:", e2);
    return err("Gagal menjual kartu. Pastikan supabase/stage11.sql sudah dijalankan.", 500);
  }
  return NextResponse.json({ ok: true, sold: ids.length, earned: total, coins: Number(coins) });
}
