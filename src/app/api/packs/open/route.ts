import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { syncBorders } from "@/lib/notify";
import { readWallet } from "@/lib/balance";
import { TIER, type TierKey } from "@/lib/types";

const body = z.object({ packId: z.number().int().positive() });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// Weighted pick done with Node's crypto RNG on the server. The client never influences the result.
function pickTier(odds: Record<string, number>, available: Set<string>): string | null {
  const e = Object.entries(odds).filter(([t, w]) => available.has(t) && Number(w) > 0);
  const sum = e.reduce((s, [, w]) => s + Number(w), 0);
  if (!sum) return null;
  let r = randomInt(0, Math.max(1, Math.round(sum * 100000))) / 100000;
  for (const [t, w] of e) { if (r < Number(w)) return t; r -= Number(w); }
  return e[e.length - 1][0];
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("open:" + user.id, 30, 60_000)) return err("Too fast. Wait a moment.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Invalid request.", 400);

  // Semua bacaan yang saling bebas dijalankan BERSAMAAN (dulu beruntun: pack -> saldo -> kartu; membuat animasi pack menunggu server).
  // price columns only exist after stage11 / stage12; fall back to simpler reads so free packs keep working before that
  const loadPack = async () => {
    let q: any = await db.from("packs").select("id, card_count, odds, enabled, coin_price, voucher_kind, voucher_cost").eq("id", p.data.packId).maybeSingle();
    if (q.error) q = await db.from("packs").select("id, card_count, odds, enabled, coin_price").eq("id", p.data.packId).maybeSingle();
    if (q.error) q = await db.from("packs").select("id, card_count, odds, enabled").eq("id", p.data.packId).maybeSingle();
    return q;
  };
  const [packQ, wallet, { data: cards }] = await Promise.all([
    loadPack(),
    readWallet(user.id),
    db.from("cards").select("id, collection_number, name, tier, description, sprite_data").eq("enabled", true),
  ]);
  const pack = packQ.data;
  if (!pack || !pack.enabled) return err("Pack not found.", 404);
  // payment: vouchers (blue / gold) if the pack has a voucher kind, otherwise coins, otherwise free
  const vKind: "blue" | "gold" | null = pack.voucher_kind === "blue" || pack.voucher_kind === "gold" ? pack.voucher_kind : null;
  const vCost = Math.max(1, Math.round(Number(pack.voucher_cost ?? 1)));
  const price = vKind ? 0 : Math.max(0, Math.round(Number(pack.coin_price ?? 0)));
  const vName = vKind === "gold" ? "voucher emas" : "voucher biru";
  if (vKind) {
    const have = vKind === "gold" ? wallet.gold : wallet.blue;
    if (have < vCost) return err(`Kamu butuh ${vCost} ${vName} untuk membuka pack ini (punya ${have}). Beli di menu SHOP.`, 402);
  } else if (price > 0) {
    if (wallet.coins < price) return err(`Coin kamu kurang. Pack ini ${price.toLocaleString("id-ID")} coin.`, 402);
  }

  const cooldown = Number(process.env.PACK_COOLDOWN_SECONDS ?? 0);
  if (cooldown > 0) {
    const { data: last } = await db.from("pack_openings").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const wait = last ? cooldown - (Date.now() - new Date(last.created_at).getTime()) / 1000 : 0;
    if (wait > 0) return err(`Next pack in ${Math.ceil(wait)} seconds.`, 429);
  }

  const pool: Record<string, any[]> = {};
  for (const c of cards ?? []) (pool[c.tier] ??= []).push(c);
  const available = new Set(Object.keys(pool));

  const draws: any[] = [];
  for (let i = 0; i < pack.card_count; i++) {
    const tier = pickTier(pack.odds as Record<string, number>, available);
    if (!tier) return err("No cards available for this pack.", 500);
    draws.push(pool[tier][randomInt(0, pool[tier].length)]);
  }

  const ids = draws.map((c) => c.id);
  const { data: had } = await db.from("user_cards").select("card_id").eq("user_id", user.id).in("card_id", ids);
  const owned = new Set((had ?? []).map((r) => r.card_id));

  // paid pack: the vouchers / coins are taken and the cards saved in ONE database transaction, so nothing is lost if either step fails
  const { error } = vKind
    ? await db.rpc("record_opening_voucher", { p_user: user.id, p_pack: pack.id, p_cards: ids, p_kind: vKind, p_cost: vCost })
    : price > 0
      ? await db.rpc("record_opening_paid", { p_user: user.id, p_pack: pack.id, p_cards: ids, p_price: price })
      : await db.rpc("record_opening", { p_user: user.id, p_pack: pack.id, p_cards: ids });
  if (error) {
    if (/insufficient/i.test(error.message)) return err(vKind ? `Kamu butuh ${vCost} ${vName}.` : "Coin kamu kurang.", 402);
    console.error("record opening:", error);
    return err("Could not save your cards. Nothing was charged. Try again.", 500);
  }
  const unlockedBorders = await syncBorders(user.id);
  const result = draws
    .map((c) => {
      const isNew = !owned.has(c.id);
      owned.add(c.id);
      return { id: c.id, no: c.collection_number, sprite: c.sprite_data, owned: true, name: c.name, tier: c.tier as TierKey, description: c.description, isNew };
    })
    .sort((a, b) => TIER[a.tier].rank - TIER[b.tier].rank); // best card is revealed last
  return NextResponse.json({ cards: result, unlockedBorders });
}
