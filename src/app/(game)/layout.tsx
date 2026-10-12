import { redirect } from "next/navigation";
import MeowTitle from "@/components/MeowTitle";
import Nav from "@/components/Nav";
import AudioDock from "@/components/AudioDock";
import PresenceBeat from "@/components/PresenceBeat";
import LogoutButton from "@/components/LogoutButton";
import CoinBadge from "@/components/CoinBadge";
import VoucherBadge from "@/components/VoucherBadge";
import { readWallet } from "@/lib/balance";
import { getUser } from "@/lib/auth";
import { notifCounts } from "@/lib/notify";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // notifikasi + saldo dibaca bersamaan (dulu 4 langkah beruntun); saldo & voucher kini satu query (lib/balance.ts)
  const [{ unread, claimable }, { coins, blue, gold }] = await Promise.all([notifCounts(user.id), readWallet(user.id)]);
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
      <PresenceBeat />
    </>
  );
}
