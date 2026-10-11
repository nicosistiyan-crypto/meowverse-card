"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import VoucherIcon from "./VoucherIcon";
import { WALLET_UPDATE, type WalletData } from "@/lib/wallet";
import { VOUCHER, type VoucherKind } from "@/lib/types";

// Voucher balance in the top-right corner, to the LEFT of the coin badge (blue next to the coin, gold left of blue).
// The numbers are refreshed by CoinBadge (one request for the whole wallet); the badge pops when the count goes up.
// Hidden in the profile section like the coin badge.
export default function VoucherBadge({ kind, count: c0 }: { kind: VoucherKind; count: number }) {
  const path = (usePathname() ?? "").toLowerCase();
  const [count, setCount] = useState(c0);
  const [pop, setPop] = useState(false);
  const prev = useRef(c0);
  useEffect(() => { setCount(c0); prev.current = c0; }, [c0]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const n = (e as CustomEvent<WalletData>).detail?.[kind];
      if (typeof n !== "number") return;
      if (n > prev.current) { setPop(true); clearTimeout(t); t = setTimeout(() => setPop(false), 1200); }
      prev.current = n; setCount(n);
    };
    window.addEventListener(WALLET_UPDATE, on);
    return () => { clearTimeout(t); window.removeEventListener(WALLET_UPDATE, on); };
  }, [kind]);
  if (path === "/profile" || path.startsWith("/u/")) return null;
  return (
    <div className={"vchb " + kind + (pop ? " pop" : "")} role="status" aria-label={`${count} ${VOUCHER[kind].label}`} title={VOUCHER[kind].label}>
      <VoucherIcon kind={kind} size={18} />
      <span>{count.toLocaleString("id-ID")}</span>
    </div>
  );
}
