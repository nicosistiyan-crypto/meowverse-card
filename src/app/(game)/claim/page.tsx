import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncBorders } from "@/lib/notify";
import ClaimClient from "@/components/ClaimClient";

export const dynamic = "force-dynamic";

export default async function Claim() {
  const user = await getUser();
  if (!user) redirect("/login");
  await syncBorders(user.id);
  const [owned, { data }, prof] = await Promise.all([
    db.from("user_cards").select("card_id").eq("user_id", user.id),
    db.from("user_borders").select("border, claimed_at").eq("user_id", user.id),
    db.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle(),
  ]);
  const rows = (data ?? []).map((r) => ({ border: r.border as string, claimed: !!r.claimed_at }));
  return <ClaimClient username={user.username} avatarUrl={prof.data?.avatar_url ?? null} count={new Set((owned.data ?? []).map((r) => r.card_id)).size} rows={rows} />;
}
