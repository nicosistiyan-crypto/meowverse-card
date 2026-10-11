import Link from "next/link";
import MeowTitle from "@/components/MeowTitle";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFusionBonus, getFusionChances, getVoucherPrices } from "@/lib/settings";
import AdminOdds from "@/components/AdminOdds";
import AdminCoins from "@/components/AdminCoins";
import AdminShop from "@/components/AdminShop";
import CoinBadge from "@/components/CoinBadge";

const count = async (table: string) =>
  (await db.from(table).select("*", { count: "exact", head: true })).count ?? 0;

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") notFound(); // regular users get a 404, no hint that /admin exists
  const [users, cards, openings, fusions, packs, fusion, bonus] = await Promise.all([
    count("users"), count("cards"), count("pack_openings"), count("fusions"),
    db.from("packs").select("id, name, odds").order("id"), getFusionChances(), getFusionBonus(),
  ]);
  let shopPacks = await db.from("packs").select("id, name, card_count, coin_price, voucher_kind, voucher_cost").order("id");
  if (shopPacks.error) shopPacks = (await db.from("packs").select("id, name, card_count, coin_price").order("id")) as typeof shopPacks;   // before stage12.sql
  if (shopPacks.error) shopPacks = (await db.from("packs").select("id, name, card_count").order("id")) as typeof shopPacks;                  // before stage11.sql
  const voucherPrices = await getVoucherPrices();
  const { data: wallet } = await db.from("users").select("coins").eq("id", user.id).maybeSingle();
  const coins = Number((wallet as any)?.coins ?? 0);
  return (
    <div className="center">
      <div className="box" style={{ width: "min(680px,94vw)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div className="px"><MeowTitle size={12} /></div>
          <CoinBadge coins={coins} />
        </div>
        <h1>Admin</h1>
        <p>Users: {users} · Cards: {cards} · Pack openings: {openings} · Fusions: {fusions}</p>
        <AdminCoins />
        <AdminShop prices={voucherPrices} packs={((shopPacks.data ?? []) as any[]).map((p) => {
          const vk = p.voucher_kind === "blue" || p.voucher_kind === "gold" ? (p.voucher_kind as "blue" | "gold") : null;
          return { id: p.id, name: p.name, card_count: p.card_count, pay: vk ?? (Number(p.coin_price ?? 0) > 0 ? "coin" as const : "free" as const), price: vk ? Math.max(1, Number(p.voucher_cost ?? 1)) : Number(p.coin_price ?? 0) };
        })} />
        <AdminOdds packs={(packs.data ?? []) as any} fusion={fusion} bonus={bonus} />
        <Link prefetch={false} href="/home">Back</Link>
      </div>
    </div>
  );
}
