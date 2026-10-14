"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import { TIER, type PublicCard } from "@/lib/types";

type Copy = { rowId: number; card: PublicCard };

export default function GiftClient({ copies, initialTo }: { copies: Copy[]; initialTo: string }) {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const [to, setTo] = useState(initialTo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const picked = copies.find((c) => c.rowId === sel);

  async function send() {
    if (!picked) return;
    const name = to.trim().toLowerCase();
    if (!window.confirm(`Kirim kartu ${picked.card.name} (${TIER[picked.card.tier!].label}) ke ${name}? Kartu akan pindah ke koleksinya dan tidak bisa dibatalkan.`)) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/gift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowId: picked.rowId, to: name }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setOk(true); setMsg(`${d.name} berhasil dikirim ke ${d.to}.`); setSel(null); router.refresh(); }
    else { setOk(false); setMsg(d.error ?? "Gagal mengirim kartu."); }
  }

  return (
    <>
      <h2>KIRIM KARTU</h2>
      <p className="msg">Pilih satu kartu dari koleksimu, isi username penerima, lalu kirim. Kartu pindah ke pemain itu dan hilang dari koleksimu. Kamu bisa mencari username di menu CARI.</p>
      <div className="row">
        <input placeholder="username penerima" maxLength={20} value={to} onChange={(e) => setTo(e.target.value.toLowerCase())} />
        <button className="big" disabled={busy || !picked || !/^[a-z0-9_]{3,20}$/.test(to.trim())} onClick={send}>
          {busy ? "MENGIRIM..." : picked ? `KIRIM ${picked.card.name!.toUpperCase()}` : "PILIH KARTU"}
        </button>
      </div>
      {msg && <p className="msg" role="status" style={{ color: ok ? "var(--acc)" : "#ff6b6b" }}>{msg}</p>}
      <h2>Kartumu</h2>
      {copies.length === 0 ? <div className="empty">Belum ada kartu untuk dikirim. Buka pack dulu!</div> : (
        <div className="grid">
          {copies.map((c) => (
            <div key={c.rowId} className={"pickc" + (c.rowId === sel ? " sel" : "")}>
              <Card card={c.card} total={0} onClick={() => setSel(c.rowId === sel ? null : c.rowId)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
