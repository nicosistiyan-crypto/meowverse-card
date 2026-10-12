import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { getFusionBonus, getFusionChances } from "@/lib/settings";
import { syncRewards } from "@/lib/notify";
import { FUSABLE, TIER_KEYS } from "@/lib/types";

const body = z.object({ ids: z.array(z.number().int().positive()).length(3) });
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("fuse:" + user.id, 20, 60_000)) return err("Too fast. Wait a moment.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success || new Set(p.data.ids).size !== 3) return err("Pilih 3 kartu yang berbeda.");
  const ids = p.data.ids;

  // Only rows that belong to THIS user are returned, so nobody can fuse someone else's cards.
  const { data: rows } = await db.from("user_cards").select("id, cards(tier)").eq("user_id", user.id).in("id", ids);
  if (!rows || rows.length !== 3) return err("Kartu tidak ditemukan di koleksimu.");
  const tiers = new Set(rows.map((r: any) => r.cards?.tier));
  if (tiers.size !== 1) return err("Ketiga kartu harus bertier sama.");
  const tier = [...tiers][0] as (typeof TIER_KEYS)[number];
  if (!FUSABLE.includes(tier)) return err("Tier ini tidak bisa difusi.");

  const [chances, bonus] = await Promise.all([getFusionChances(), getFusionBonus()]);
  const up = TIER_KEYS[TIER_KEYS.indexOf(tier) + 1];
  // One roll in 0..9999: first slice = ABSOLUTE, next slice = PRIME, otherwise the normal tier-up roll.
  const roll = randomInt(0, 10000);
  const absP = bonus.ABSOLUTE * 100, priP = bonus.PRIME * 100;
  let target: string = tier;
  if (roll < absP) target = "ABSOLUTE";
  else if (roll < absP + priP) target = "PRIME";
  else if (randomInt(0, 10000) < Number(chances[tier] ?? 0) * 100) target = up;

  // No tier filter in the query: filtering by an enum value that does not exist yet in the database
  // (e.g. stage4_a.sql not run) makes the whole query fail. We filter in JS instead.
  const { data: cards, error: cardsErr } = await db.from("cards").select("id, collection_number, name, tier, description, sprite_data").eq("enabled", true);
  if (cardsErr) { console.error("fusion cards query:", cardsErr); return err("Gagal memuat daftar kartu: " + cardsErr.message, 500); }
  let pool = (cards ?? []).filter((c: any) => c.tier === target);
  if (!pool.length) { target = tier; pool = (cards ?? []).filter((c: any) => c.tier === tier); }
  if (!pool.length) return err(`Tidak ada kartu aktif bertier ${tier} untuk hasil fusi.`, 500);
  const c: any = pool[randomInt(0, pool.length)];

  const { error } = await db.rpc("fuse_cards", { p_user: user.id, p_rows: ids, p_result: c.id });
  if (error) { console.error("fuse_cards rpc:", error); return err("Fusi gagal (kartumu tidak berubah): " + error.message, 500); }
  await syncRewards(user.id);
  return NextResponse.json({
    upgraded: target !== tier, kind: target === tier ? "same" : target === up ? "up" : "bonus", from: tier,
    card: { id: c.id, no: c.collection_number, sprite: c.sprite_data, owned: true, name: c.name, tier: c.tier, description: c.description },
  });
}
