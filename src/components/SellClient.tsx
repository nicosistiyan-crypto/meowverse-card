"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import CoinIcon from "./CoinIcon";
import { refreshWallet } from "@/lib/wallet";
import { SELL_PRICE, TIER, TIER_KEYS, type PublicCard, type TierKey } from "@/lib/types";

type Copy = { rowId: number; card: PublicCard };
const fmt = (n: number) => n.toLocaleString("id-ID");
const MAX_SELL = 300;

export default function SellClient({ copies }: { copies: Copy[] }) {
  const router = useRouter();
  const [flt, setFlt] = useState<"ALL" | TierKey>("ALL");
  const [sel, setSel] = useState<number[]>([]);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);

  const price = (c: Copy) => SELL_PRICE[c.card.tier!];
  const list = useMemo(() => copies.filter((c) => flt === "ALL" || c.card.tier === flt), [copies, flt]);
  const chosen = useMemo(() => copies.filter((c) => sel.includes(c.rowId)), [copies, sel]);
  const total = chosen.reduce((s, c) => s + price(c), 0);
  // how many copies of each card the player owns, to warn before the LAST copy of a card is sold
  const owned = useMemo(() => { const m = new Map<number, number>(); copies.forEach((c) => m.set(c.card.id, (m.get(c.card.id) ?? 0) + 1)); return m; }, [copies]);
  const soldPer = useMemo(() => { const m = new Map<number, number>(); chosen.forEach((c) => m.set(c.card.id, (m.get(c.card.id) ?? 0) + 1)); return m; }, [chosen]);
  const lastCopies = chosen.filter((c, i) => soldPer.get(c.card.id) === owned.get(c.card.id) && chosen.findIndex((x) => x.card.id === c.card.id) === i);

  const toggle = (c: Copy) => setSel((s) => s.includes(c.rowId) ? s.filter((x) => x !== c.rowId) : s.length < MAX_SELL ? [...s, c.rowId] : s);
  // every copy beyond the first one of each card (the first one stays in the collection)
  function pickDuplicates() {
    const seen = new Set<number>(), ids: number[] = [];
    for (const c of copies) { if (seen.has(c.card.id)) ids.push(c.rowId); else seen.add(c.card.id); }
    setSel(ids.slice(0, MAX_SELL));
  }

  // JUAL SEMUA per tier (hanya C, B, A): pilih semua kartu di tier itu lalu buka konfirmasi jual
  const BULK_TIERS: TierKey[] = ["C", "B", "A"];
  function sellAllTier(t: TierKey) {
    const ids = copies.filter((c) => c.card.tier === t).map((c) => c.rowId);
    if (!ids.length) return;
    setSel(ids.slice(0, MAX_SELL));
    setOk(true);
    setMsg(ids.length > MAX_SELL ? `Tier ${TIER[t].label} punya ${ids.length} kartu. Maksimal ${MAX_SELL} kartu per penjualan, jadi ${MAX_SELL} dipilih dulu.` : "");
    setAsk(true);
  }

  async function sell() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false); setAsk(false);
    if (r.ok) { setOk(true); setMsg(`✔ ${d.sold} kartu terjual, +${fmt(d.earned)} coin. Saldo sekarang: ${fmt(d.coins)}.`); setSel([]); refreshWallet(); router.refresh(); }
    else { setOk(false); setMsg(d.error ?? "Gagal menjual kartu."); }
  }

  return (
    <>
      <h2>JUAL KARTU</h2>
      <p className="msg">Pilih kartu yang mau dijual, lalu tekan JUAL. Kartu yang terjual hilang dari koleksimu dan kamu dapat coin sesuai tier-nya.</p>
      <div className="sellprices">
        {TIER_KEYS.map((t) => <span key={t}><b>{TIER[t].label}</b> <CoinIcon size={12} />{fmt(SELL_PRICE[t])}</span>)}
      </div>
      <div className="row">
        {(["ALL", ...TIER_KEYS] as ("ALL" | TierKey)[]).map((f) => (
          <button key={f} className={f === flt ? "on" : ""} onClick={() => setFlt(f)}>{f === "ALL" ? "ALL" : TIER[f].label}</button>
        ))}
        <span className="rowr"><Link prefetch={false} className="lnkb" href="/collection">KARTU</Link></span>
      </div>
      <div className="row">
        <button onClick={pickDuplicates}>PILIH SEMUA DUPLIKAT</button>
        <button onClick={() => setSel([])} disabled={!sel.length}>BATAL PILIH</button>
      </div>
      <div className="row">
        {BULK_TIERS.map((t) => {
          const n = copies.filter((c) => c.card.tier === t).length;
          return <button key={t} disabled={busy || n === 0} onClick={() => sellAllTier(t)}>JUAL SEMUA {TIER[t].label} ({n})</button>;
        })}
      </div>
      {msg && <p className="msg" role="status" style={{ color: ok ? "var(--acc)" : "#ff6b6b" }}>{msg}</p>}

      {copies.length === 0 ? <div className="empty">Belum ada kartu untuk dijual. Buka pack dulu!</div>
        : list.length === 0 ? <div className="empty">Tidak ada kartu di filter ini.</div> : (
        <div className="grid">
          {list.map((c) => (
            <div key={c.rowId} className={"sellc pickc" + (sel.includes(c.rowId) ? " sel" : "")}>
              <Card card={c.card} total={0} onClick={() => toggle(c)} />
              <div className="sellp"><CoinIcon size={12} />{fmt(price(c))}</div>
            </div>
          ))}
        </div>
      )}

      {sel.length > 0 && (
        <div className="sellbar">
          <span className="px" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>{sel.length} KARTU · +<CoinIcon size={16} />{fmt(total)}</span>
          <button className="big" style={{ width: "auto", padding: "12px 20px", fontSize: 12 }} disabled={busy} onClick={() => setAsk(true)}>JUAL</button>
        </div>
      )}

      {ask && (
        <div className="ov on" onClick={(e) => { if (e.target === e.currentTarget && !busy) setAsk(false); }}>
          <div className="panelm">
            <h3>JUAL {sel.length} KARTU?</h3>
            <p>Kamu akan mendapat <b style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CoinIcon size={14} />{fmt(total)}</b> coin. Kartu yang dijual tidak bisa dikembalikan.</p>
            {lastCopies.length > 0 && (
              <p style={{ color: "#ffb74d" }}>Perhatian: ini kartu TERAKHIR yang kamu punya untuk {lastCopies.slice(0, 4).map((c) => c.card.name).join(", ")}{lastCopies.length > 4 ? ` dan ${lastCopies.length - 4} lainnya` : ""}. Kartunya akan hilang dari koleksi.</p>
            )}
            {chosen.some((c) => TIER[c.card.tier!].rank >= 5) && <p style={{ color: "#ff6b6b" }}>Ada kartu PRIME / ABSOLUTE / COLLECTOR di pilihanmu. Pastikan kamu yakin.</p>}
            <div className="row">
              <button className="big" style={{ width: "auto" }} disabled={busy} onClick={sell}>{busy ? "..." : "YA, JUAL"}</button>
              <button disabled={busy} onClick={() => setAsk(false)}>BATAL</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
