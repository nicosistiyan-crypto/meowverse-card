import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { syncRewards } from "@/lib/notify";
import { REWARDS, REWARD_KEYS, type RewardKey } from "@/lib/types";

const body = z.object({ reward: z.enum(REWARD_KEYS as [RewardKey, ...RewardKey[]]) });
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("claimr:" + user.id, 20, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Hadiah tidak dikenal.");
  await syncRewards(user.id);   // pastikan semua yang sudah memenuhi syarat sudah terbuka
  const coins = REWARDS[p.data.reward].coins;   // jumlah coin dari server, bukan dari browser
  const { data, error } = await db.rpc("claim_reward", { p_user: user.id, p_reward: p.data.reward, p_coins: coins });
  if (error) { console.error("claim_reward:", error); return err("Gagal mengklaim: " + error.message, 500); }
  if (Number(data) < 0) return err("Hadiah ini belum terbuka atau sudah diklaim.", 409);
  return NextResponse.json({ ok: true, reward: p.data.reward, coins, balance: Number(data) });
}
