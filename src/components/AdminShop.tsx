"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CoinIcon from "./CoinIcon";
import VoucherIcon from "./VoucherIcon";

type Pack = { id: number; name: string; card_count: number; pay: "free" | "coin" | "blue" | "gold"; price: number };

// Admin: voucher prices, and for every pack its cards-per-pack and its coin price (0 = free).
export default function AdminShop({ prices, packs }: { prices: { blue: number; gold: number }; packs: Pack[] }) {
  const router = useRouter();
  const [vp, setVp] = useState({ blue: String(prices.blue), gold: String(prices.gold) });
  const [pk, setPk] = useState<Record<number, { cards: string; pay: string; price: string }>>(
    Object.fromEntries(packs.map((p) => [p.id, { cards: String(p.card_count), pay: p.pay, price: String(p.price) }])));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  async function save() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/shop", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucher: { blue: n(vp.blue), gold: n(vp.gold) }, packs: packs.map((p) => ({ id: p.id, cardCount: Math.max(1, n(pk[p.id].cards)), pay: pk[p.id].pay, price: n(pk[p.id].price) })) }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Tersimpan ✔ (" + new Date().toLocaleTimeString() + ")" : d.error ?? "Gagal menyimpan.");
    setBusy(false); if (r.ok) router.refresh();
  }
  return (
    <>
      <h2>Toko &amp; harga</h2>
      <p className="msg">Harga voucher (dalam coin) dan cara bayar tiap pack: gratis, voucher biru, voucher emas, atau coin. Harga pack voucher = jumlah voucher yang terpakai tiap buka.</p>
      <div className="oddsg">
        <label style={{ display: "grid", gap: 4 }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><VoucherIcon kind="blue" size={14} /> Voucher biru</span>
          <input type="number" min={0} step={1} value={vp.blue} onChange={(e) => setVp({ ...vp, blue: e.target.value })} />
        </label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><VoucherIcon kind="gold" size={14} /> Voucher emas</span>
          <input type="number" min={0} step={1} value={vp.gold} onChange={(e) => setVp({ ...vp, gold: e.target.value })} />
        </label>
      </div>
      {packs.map((p) => (
        <div key={p.id} style={{ marginTop: 12 }}>
          <h3>{p.name}</h3>
          <div className="oddsg">
            <label>Kartu per pack
              <input type="number" min={1} max={20} step={1} value={pk[p.id].cards} onChange={(e) => setPk({ ...pk, [p.id]: { ...pk[p.id], cards: e.target.value } })} />
            </label>
            <label>Pembayaran
              <select value={pk[p.id].pay} onChange={(e) => setPk({ ...pk, [p.id]: { ...pk[p.id], pay: e.target.value, price: e.target.value === "blue" || e.target.value === "gold" ? String(Math.max(1, n(pk[p.id].price))) : pk[p.id].price } })}>
                <option value="free">Gratis</option><option value="blue">Voucher biru</option><option value="gold">Voucher emas</option><option value="coin">Coin</option>
              </select>
            </label>
            {pk[p.id].pay !== "free" && (
              <label><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{pk[p.id].pay === "coin" ? <CoinIcon size={12} /> : <VoucherIcon kind={pk[p.id].pay as "blue" | "gold"} size={12} />} {pk[p.id].pay === "coin" ? "Harga (coin)" : "Jumlah voucher"}</span>
                <input type="number" min={pk[p.id].pay === "coin" ? 0 : 1} step={1} value={pk[p.id].price} onChange={(e) => setPk({ ...pk, [p.id]: { ...pk[p.id], price: e.target.value } })} />
              </label>
            )}
          </div>
        </div>
      ))}
      <div className="row"><button onClick={save} disabled={busy}>SIMPAN TOKO</button>{msg && <span className="msg" role="status">{msg}</span>}</div>
    </>
  );
}
