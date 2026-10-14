"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import { TIER, TIER_KEYS, type PublicCard, type TierKey } from "@/lib/types";

type Copy = { rowId: number; card: PublicCard };
const MAX_GIFT = 50;   // harus sama dengan batas di /api/gift

export default function GiftClient({ copies, initialTo }: { copies: Copy[]; initialTo: string }) {
  const router = useRouter();
  const [flt, setFlt] = useState<"ALL" | TierKey>("ALL");
  const [sel, setSel] = useState<number[]>([]);
  const [to, setTo] = useState(initialTo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const list = useMemo(() => copies.filter((c) => flt === "ALL" || c.card.tier === flt), [copies, flt]);
  const chosen = useMemo(() => copies.filter((c) => sel.includes(c.rowId)), [copies, sel]);

  const toggle = (id: number) => setSel((s) => {
    if (s.includes(id)) return s.filter((x) => x !== id);
    if (s.length >= MAX_GIFT) { setOk(false); setMsg(`Maksimal ${MAX_GIFT} kartu per kiriman.`); return s; }
    setMsg(""); return [...s, id];
  });
  const pickShown = () => setSel((s) => [...new Set([...s, ...list.map((c) => c.rowId)])].slice(0, MAX_GIFT));

  async function send() {
    if (!chosen.length) return;
    const name = to.trim().toLowerCase();
    const label = chosen.length === 1 ? `kartu ${chosen[0].card.name} (${TIER[chosen[0].card.tier!].label})` : `${chosen.length} kartu`;
    if (!window.confirm(`Kirim ${label} ke ${name}? Kartu akan pindah ke koleksinya dan tidak bisa dibatalkan.`)) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/gift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowIds: chosen.map((c) => c.rowId), to: name }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setOk(true); setMsg(d.count > 1 ? `${d.count} kartu berhasil dikirim ke ${d.to}.` : `${d.name} berhasil dikirim ke ${d.to}.`); setSel([]); router.refresh(); }
    else { setOk(false); setMsg(d.error ?? "Gagal mengirim kartu."); }
  }

  return (
    <>
      <h2>KIRIM KARTU</h2>
      <p className="msg">Pilih satu atau banyak kartu (maksimal {MAX_GIFT} sekali kirim) dari koleksimu, isi username penerima, lalu kirim. Kartu pindah ke pemain itu dan hilang dari koleksimu. Kamu bisa mencari username di menu CARI.</p>
      <div className="row">
        <input placeholder="username penerima" maxLength={20} value={to} onChange={(e) => setTo(e.target.value.toLowerCase())} />
        <button className="big" disabled={busy || !chosen.length || !/^[a-z0-9_]{3,20}$/.test(to.trim())} onClick={send}>
          {busy ? "MENGIRIM..." : chosen.length ? `KIRIM ${chosen.length} KARTU` : "PILIH KARTU"}
        </button>
      </div>
      {msg && <p className="msg" role="status" style={{ color: ok ? "var(--acc)" : "#ff6b6b" }}>{msg}</p>}
      <div className="row">
        {(["ALL", ...TIER_KEYS] as ("ALL" | TierKey)[]).map((f) => (
          <button key={f} className={f === flt ? "on" : ""} onClick={() => setFlt(f)}>{f === "ALL" ? "ALL" : TIER[f].label}</button>
        ))}
      </div>
      <div className="row">
        <button onClick={pickShown} disabled={!list.length || busy}>PILIH SEMUA YANG TAMPIL</button>
        <button onClick={() => setSel([])} disabled={!sel.length || busy}>BATAL PILIH ({sel.length})</button>
      </div>
      <h2>Kartumu</h2>
      {copies.length === 0 ? <div className="empty">Belum ada kartu untuk dikirim. Buka pack dulu!</div> : (
        <div className="grid">
          {list.map((c) => (
            <div key={c.rowId} className={"pickc" + (sel.includes(c.rowId) ? " sel" : "")}>
              <Card card={c.card} total={0} onClick={() => toggle(c.rowId)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
