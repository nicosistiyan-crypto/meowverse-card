"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CoinIcon from "./CoinIcon";

export default function AdminCoins() {
  const router = useRouter();
  const [who, setWho] = useState("");
  const [amt, setAmt] = useState("100");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(self: boolean) {
    const amount = Math.floor(Number(amt));
    if (!Number.isFinite(amount) || amount < 1) { setMsg("Isi jumlah coin minimal 1."); return; }
    if (!self && !who.trim()) { setMsg("Isi username penerima, atau pakai ISI COIN SAYA."); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/coins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(self ? { amount } : { username: who.trim(), amount }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `✔ ${amount.toLocaleString("id-ID")} coin masuk ke ${d.username}. Saldo sekarang: ${Number(d.balance).toLocaleString("id-ID")}.` : d.error ?? "Gagal menambah coin.");
    setBusy(false); if (r.ok) router.refresh();
  }
  return (
    <>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><CoinIcon size={22} /> Coin</h2>
      <p className="msg">Kirim coin ke pemain, atau isi coin untuk akunmu sendiri.</p>
      <div className="oddsg">
        <label>Username penerima
          <input value={who} onChange={(e) => setWho(e.target.value)} maxLength={20} placeholder="contoh: meowmaster" autoCapitalize="none" autoComplete="off" />
        </label>
        <label>Jumlah coin
          <input type="number" min={1} max={1000000000} step={1} value={amt} onChange={(e) => setAmt(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button onClick={() => send(false)} disabled={busy}>KIRIM KE USER</button>
        <button onClick={() => send(true)} disabled={busy}>ISI COIN SAYA</button>
      </div>
      {msg && <p className="msg" role="status">{msg}</p>}
    </>
  );
}
