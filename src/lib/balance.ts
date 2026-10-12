import "server-only";
import { db } from "./db";
import { timed } from "./perf";

export type Wallet = { coins: number; blue: number; gold: number };

/** Saldo coin + voucher dalam SATU query (dulu dua query beruntun). Sebelum stage11.sql kolom voucher belum ada: coin tetap terbaca, voucher 0. */
export async function readWallet(userId: string): Promise<Wallet> {
  return timed("wallet", async () => {
    const q = await db.from("users").select("coins, blue_vouchers, gold_vouchers").eq("id", userId).maybeSingle();
    if (!q.error) {
      const d = q.data as any;
      return { coins: Number(d?.coins ?? 0), blue: Number(d?.blue_vouchers ?? 0), gold: Number(d?.gold_vouchers ?? 0) };
    }
    const c = await db.from("users").select("coins").eq("id", userId).maybeSingle();
    return { coins: Number((c.data as any)?.coins ?? 0), blue: 0, gold: 0 };
  });
}
