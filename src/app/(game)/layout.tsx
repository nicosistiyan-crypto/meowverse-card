import { redirect } from "next/navigation";
import MeowTitle from "@/components/MeowTitle";
import Nav from "@/components/Nav";
import AudioDock from "@/components/AudioDock";
import LogoutButton from "@/components/LogoutButton";
import CoinBadge from "@/components/CoinBadge";
import VoucherBadge from "@/components/VoucherBadge";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { notifCounts } from "@/lib/notify";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { unread, claimable } = await notifCounts(user.id);
  const { data: wallet } = await db.from("users").select("coins").eq("id", user.id).maybeSingle();
  const coins = Number((wallet as any)?.coins ?? 0);
  // read separately: the coin badge must keep working even before supabase/stage11.sql has been run
  const { data: vch } = await db.from("users").select("blue_vouchers, gold_vouchers").eq("id", user.id).maybeSingle();
  const blue = Number((vch as any)?.blue_vouchers ?? 0), gold = Number((vch as any)?.gold_vouchers ?? 0);
  return (
    <>
      <main>
        <header>
          <h1><MeowTitle /></h1>
          <LogoutButton me={user.username} />
          <div className="wallet">
            <VoucherBadge kind="gold" count={gold} />
            <VoucherBadge kind="blue" count={blue} />
            <CoinBadge coins={coins} />
          </div>
        </header>
        {children}
      </main>
      <Nav me={user.username} unread={unread} claimable={claimable} />
      <AudioDock />
    </>
  );
}
