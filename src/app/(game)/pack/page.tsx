import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TIER, type TierKey } from "@/lib/types";
import PackOpener from "@/components/PackOpener";

export const dynamic = "force-dynamic";

export default async function PackPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  let q = await db.from("packs").select("id, name, card_count, odds, coin_price, voucher_kind, voucher_cost").eq("enabled", true).order("id");
  if (q.error) q = (await db.from("packs").select("id, name, card_count, odds, coin_price").eq("enabled", true).order("id")) as typeof q;   // before stage12.sql
  if (q.error) q = (await db.from("packs").select("id, name, card_count, odds").eq("enabled", true).order("id")) as typeof q;               // before stage11.sql
  const data = q.data;
  const { data: wallet } = await db.from("users").select("coins").eq("id", user.id).maybeSingle();
  const { data: vch } = await db.from("users").select("blue_vouchers, gold_vouchers").eq("id", user.id).maybeSingle();
  const packs = (data ?? []).map((p: any) => {
    const sum = Object.values(p.odds as Record<string, number>).reduce((s, w) => s + Number(w), 0) || 1;
    return {
      id: p.id, name: p.name, cardCount: p.card_count, coinPrice: Number(p.coin_price ?? 0),
      voucherKind: p.voucher_kind === "blue" || p.voucher_kind === "gold" ? (p.voucher_kind as "blue" | "gold") : null, voucherCost: Math.max(1, Number(p.voucher_cost ?? 1)),
      odds: (Object.keys(TIER) as TierKey[]).filter((t) => p.odds[t]).map((t) => ({ label: TIER[t].label, pct: String(Number(((Number(p.odds[t]) / sum) * 100).toFixed(2))) })),
    };
  });
  return <PackOpener packs={packs} coins={Number((wallet as any)?.coins ?? 0)} blue={Number((vch as any)?.blue_vouchers ?? 0)} gold={Number((vch as any)?.gold_vouchers ?? 0)} />;
}
