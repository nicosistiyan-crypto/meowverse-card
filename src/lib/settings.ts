import "server-only";
import { db } from "./db";
const DEFAULT: Record<string, number> = { C: 45, B: 35, A: 25, S: 15, S_PLUS: 8 };
export async function getFusionChances() {
  const { data } = await db.from("settings").select("value").eq("key", "fusion_upgrade").maybeSingle();
  return { ...DEFAULT, ...((data?.value as Record<string, number>) ?? {}) };
}

// Extra chance on EVERY fusion to jump straight to PRIME / ABSOLUTE, whatever the input tier.
export async function getFusionBonus() {
  const { data } = await db.from("settings").select("value").eq("key", "fusion_bonus").maybeSingle();
  return { PRIME: 2, ABSOLUTE: 1, ...((data?.value as Record<string, number>) ?? {}) } as { PRIME: number; ABSOLUTE: number };
}

// Shop prices of the vouchers, in coins. Set by the admin in /admin > Toko; these defaults apply until then.
export async function getVoucherPrices() {
  const { data } = await db.from("settings").select("value").eq("key", "voucher_prices").maybeSingle();
  return { blue: 100, gold: 500, ...((data?.value as Record<string, number>) ?? {}) } as { blue: number; gold: number };
}
