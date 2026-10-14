import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncBorders } from "@/lib/notify";   // syncBorders juga membuka hadiah coin / mahkota (stage17.sql)
import { collectedCount } from "@/lib/cards";
import ClaimClient from "@/components/ClaimClient";

export const dynamic = "force-dynamic";

export default async function Claim() {
  const user = await getUser();
  if (!user) redirect("/login");
  await syncBorders(user.id);
  const [count, { data }, prof, rw] = await Promise.all([
    collectedCount(user.id),   // sama dengan angka koleksi di menu KARTU / PROFIL
    db.from("user_borders").select("border, claimed_at").eq("user_id", user.id),
    db.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle(),
    db.from("user_rewards").select("reward, claimed_at").eq("user_id", user.id),   // error (stage17.sql belum dijalankan) = daftar kosong
  ]);
  const rows = (data ?? []).map((r) => ({ border: r.border as string, claimed: !!r.claimed_at }));
  return <ClaimClient username={user.username} avatarUrl={prof.data?.avatar_url ?? null} count={count} rows={rows} rewards={(rw.data ?? []).map((r: any) => ({ reward: r.reward as string, claimed: !!r.claimed_at }))} rewardsMissing={!!rw.error} />;
}
