"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import CoinIcon from "./CoinIcon";
import { WALLET_REFRESH, WALLET_UPDATE } from "@/lib/wallet";

// Gold cat-coin balance in the top-right corner. Hidden in the profile section (/profile and /u/...), where LOGOUT lives.
// The balance is re-read every 20 s while the tab is visible; when it goes up the badge pops.
export default function CoinBadge({ coins: c0 }: { coins: number }) {
  const path = (usePathname() ?? "").toLowerCase();
  const [coins, setCoins] = useState(c0);
  const [pop, setPop] = useState(false);
  const prev = useRef(c0);
  useEffect(() => { setCoins(c0); prev.current = c0; }, [c0]);
  useEffect(() => {
    let alive = true, t: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/coins", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (typeof d.coins !== "number") return;
        if (d.coins > prev.current) { setPop(true); clearTimeout(t); t = setTimeout(() => setPop(false), 1200); }
        prev.current = d.coins; setCoins(d.coins);
        window.dispatchEvent(new CustomEvent(WALLET_UPDATE, { detail: d }));   // the voucher badges listen to this
      } catch { /* offline: try again next tick */ }
    }
    const id = setInterval(poll, 20000);
    const vis = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener(WALLET_REFRESH, poll);           // right after a purchase / sale / pack opening
    return () => { alive = false; clearInterval(id); clearTimeout(t); document.removeEventListener("visibilitychange", vis); window.removeEventListener(WALLET_REFRESH, poll); };
  }, []);
  if (path === "/profile" || path.startsWith("/u/")) return null;
  return (
    <div className={"coinb" + (pop ? " pop" : "")} role="status" aria-label={`${coins} coin`}>
      <CoinIcon size={24} />
      <span>{coins.toLocaleString("id-ID")}</span>
    </div>
  );
}
