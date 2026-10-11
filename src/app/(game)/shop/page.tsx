import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getVoucherPrices } from "@/lib/settings";
import ShopClient from "@/components/ShopClient";

export const dynamic = "force-dynamic";

export default async function Shop() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [{ data: w }, { data: v }, prices] = await Promise.all([
    db.from("users").select("coins").eq("id", user.id).maybeSingle(),
    db.from("users").select("blue_vouchers, gold_vouchers").eq("id", user.id).maybeSingle(),
    getVoucherPrices(),
  ]);
  return (
    <ShopClient
      coins={Number((w as any)?.coins ?? 0)}
      blue={Number((v as any)?.blue_vouchers ?? 0)}
      gold={Number((v as any)?.gold_vouchers ?? 0)}
      prices={prices}
    />
  );
}
