"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CoinIcon from "./CoinIcon";
import VoucherIcon from "./VoucherIcon";
import { refreshWallet } from "@/lib/wallet";
import { VOUCHER, VOUCHER_KINDS, type VoucherKind } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("id-ID");
const MAX_QTY = 99;

export default function ShopClient({ coins: c0, blue: b0, gold: g0, prices }: { coins: number; blue: number; gold: number; prices: Record<VoucherKind, number> }) {
  const router = useRouter();
  const [coins, setCoins] = useState(c0);
  const [have, setHave] = useState<Record<VoucherKind, number>>({ blue: b0, gold: g0 });
  const [qty, setQty] = useState<Record<VoucherKind, number>>({ blue: 1, gold: 1 });
  const [busy, setBusy] = useState<VoucherKind | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);

  const step = (k: VoucherKind, d: number) => setQty((q) => ({ ...q, [k]: Math.max(1, Math.min(MAX_QTY, q[k] + d)) }));

  async function buy(k: VoucherKind) {
    setBusy(k); setMsg("");
    const r = await fetch("/api/shop/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: k, qty: qty[k] }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setCoins(d.coins); setHave({ blue: d.blue, gold: d.gold }); setOk(true);
      setMsg(`✔ ${qty[k]} ${VOUCHER[k].label} berhasil dibeli.`);
      refreshWallet(); router.refresh();
    } else { setOk(false); setMsg(d.error ?? "Pembelian gagal."); }
    setBusy(null);
  }

  return (
    <>
      <h2>SHOP</h2>
      <p className="msg">Beli voucher dengan coin. Saldo kamu: <b style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CoinIcon size={16} /> {fmt(coins)}</b></p>
      <div className="shop">
        {VOUCHER_KINDS.map((k) => {
          const total = prices[k] * qty[k], cant = total > coins;
          return (
            <div key={k} className={"shopc " + k}>
              <div className="vbig"><VoucherIcon kind={k} size={72} /></div>
              <div className="px" style={{ fontSize: 12 }}>{VOUCHER[k].label.toUpperCase()}</div>
              <div style={{ color: "var(--mute)" }}>Kamu punya: {fmt(have[k])}</div>
              <div className="price"><CoinIcon size={20} /> {fmt(prices[k])} <span style={{ color: "var(--mute)", fontSize: 9 }}>/ voucher</span></div>
              <div className="qty">
                <button aria-label="Kurangi" disabled={qty[k] <= 1} onClick={() => step(k, -1)}>−</button>
                <b className="px" style={{ fontSize: 14 }}>{qty[k]}</b>
                <button aria-label="Tambah" disabled={qty[k] >= MAX_QTY} onClick={() => step(k, 1)}>+</button>
              </div>
              <div className="price" style={{ fontSize: 10 }}>Total: <CoinIcon size={16} /> {fmt(total)}</div>
              <button className="big" disabled={busy !== null || cant || prices[k] < 0} onClick={() => buy(k)}>
                {busy === k ? "..." : cant ? "COIN KURANG" : "BELI"}
              </button>
            </div>
          );
        })}
      </div>
      {msg && <p className="msg" role="status" style={{ color: ok ? "var(--acc)" : "#ff6b6b", marginTop: 14 }}>{msg}</p>}
    </>
  );
}
