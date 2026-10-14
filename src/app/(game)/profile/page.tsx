import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncBorders } from "@/lib/notify";
import ProfileEditor from "@/components/ProfileEditor";
import { getCollection } from "@/lib/cards";
import { isBorder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: { new?: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  await syncBorders(user.id);
  const [prof, bs, cnt] = await Promise.all([
    db.from("profiles").select("avatar_url, bio, border").eq("user_id", user.id).maybeSingle(),
    db.from("user_borders").select("border, claimed_at").eq("user_id", user.id),
    db.from("user_cards").select("card_id").eq("user_id", user.id),
  ]);
  const [{ cards, total, ownedCount }, sc] = await Promise.all([getCollection(user.id, true), db.from("profiles").select("showcase").eq("user_id", user.id).maybeSingle()]);
  // angka koleksi = sama dengan menu KARTU (kartu yang pernah didapat tetap terhitung walau dijual / difusi);
  // untuk memilih PAMERAN hanya kartu yang masih dipegang sekarang
  const held = new Set((cnt.data ?? []).map((r) => r.card_id as number));
  const owned = cards.filter((c) => c.owned && held.has(c.id));
  const showcase: number[] = !sc.error && Array.isArray((sc.data as any)?.showcase) ? (sc.data as any).showcase.filter((id: number) => owned.some((c) => c.id === id)) : [];
  const claimed = (bs.data ?? []).filter((r) => r.claimed_at).map((r) => r.border as string);
  const waiting = (bs.data ?? []).filter((r) => !r.claimed_at).length;
  return (
    <ProfileEditor
      username={user.username} avatarUrl={prof.data?.avatar_url ?? null} bio={prof.data?.bio ?? ""}
      border={prof.data?.border ?? null} claimed={claimed} waiting={waiting} count={ownedCount}
      cards={owned} total={total} showcase={showcase}
      fresh={isBorder(searchParams.new) ? searchParams.new : null}
    />
  );
}
