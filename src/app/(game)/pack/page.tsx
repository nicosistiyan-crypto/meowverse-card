import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readWallet } from "@/lib/balance";
import { TIER, type TierKey } from "@/lib/types";
import PackOpener from "@/components/PackOpener";
import { packKind } from "@/lib/packBanner";

export const dynamic = "force-dynamic";

export default async function PackPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const loadPacks = async () => {
    let q = await db.from("packs").select("id, name, card_count, odds, coin_price, voucher_kind, voucher_cost").eq("enabled", true).order("id");
    if (q.error) q = (await db.from("packs").select("id, name, card_count, odds, coin_price").eq("enabled", true).order("id")) as typeof q;   // before stage12.sql
    if (q.error) q = (await db.from("packs").select("id, name, card_count, odds").eq("enabled", true).order("id")) as typeof q;               // before stage11.sql
    return q.data;
  };
  const [data, wallet] = await Promise.all([loadPacks(), readWallet(user.id)]);   // daftar pack + saldo/voucher bersamaan
  // urutan tampil: MV Pack 1, 2, 3, lalu Collector (sama dengan urutan jenis gambarnya), sisanya mengikuti id
  const place = (name: string) => { const k = packKind(name); return k === "collector" ? 4 : k; };
  const sortedData = [...(data ?? [])].sort((a: any, b: any) => place(a.name) - place(b.name) || a.id - b.id);
  const packs = sortedData.map((p: any) => ({
    id: p.id, name: p.name, cardCount: p.card_count, coinPrice: Number(p.coin_price ?? 0),
    voucherKind: p.voucher_kind === "blue" || p.voucher_kind === "gold" ? (p.voucher_kind as "blue" | "gold") : null, voucherCost: Math.max(1, Number(p.voucher_cost ?? 1)),
    tiers: (Object.keys(TIER) as TierKey[]).filter((t) => Number(p.odds?.[t]) > 0),   // hanya dipakai untuk gambar pack Collector; peluang (rarity) tidak ditampilkan
  }));
  return <PackOpener packs={packs} coins={wallet.coins} blue={wallet.blue} gold={wallet.gold} />;
}
