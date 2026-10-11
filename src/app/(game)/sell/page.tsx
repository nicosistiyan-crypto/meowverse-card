import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TIER, type PublicCard } from "@/lib/types";
import SellClient from "@/components/SellClient";

export const dynamic = "force-dynamic";

export default async function Sell() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("user_cards")
    .select("id, cards(id, collection_number, name, tier, description, sprite_data, enabled)")
    .eq("user_id", user.id).order("obtained_at", { ascending: false });
  const copies = (data ?? [])
    .filter((r: any) => r.cards && r.cards.enabled)
    .map((r: any) => ({
      rowId: r.id as number,
      card: { id: r.cards.id, no: r.cards.collection_number, sprite: r.cards.sprite_data, owned: true, name: r.cards.name, tier: r.cards.tier, description: r.cards.description } as PublicCard,
    }))
    .sort((a, b) => TIER[a.card.tier!].rank - TIER[b.card.tier!].rank || a.card.no - b.card.no);
  return <SellClient copies={copies} />;
}
