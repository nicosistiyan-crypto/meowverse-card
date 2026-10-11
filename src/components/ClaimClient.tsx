"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { BORDERS, BORDER_KEYS, type BorderKey } from "@/lib/types";

type Row = { border: string; claimed: boolean };

export default function ClaimClient({ username, avatarUrl, count, rows }: { username: string; avatarUrl: string | null; count: number; rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<BorderKey | null>(null);
  const [msg, setMsg] = useState("");

  async function claim(b: BorderKey) {
    setBusy(b); setMsg("");
    const r = await fetch("/api/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ border: b }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { router.push(`/profile?new=${b}#border`); router.refresh(); return; }   // straight to Edit Profil > Border Profil
    setMsg(d.error ?? "Gagal mengklaim."); setBusy(null);
  }

  return (
    <>
      <h2>CLAIM</h2>
      <p className="msg">Kumpulkan kartu berbeda untuk membuka border profil (kartu duplikat tidak dihitung). Kartu unikmu sekarang: <b>{count}</b>. Border yang sudah terbuka tetap jadi milikmu walau koleksimu berkurang (misalnya karena fusi).</p>
      <div className="bcards">
        {BORDER_KEYS.map((k) => {
          const b = BORDERS[k], row = rows.find((r) => r.border === k);
          const state = row?.claimed ? "owned" : row ? "claimable" : "locked";
          const pct = Math.min(100, Math.round((count / b.need) * 100));
          return (
            <div key={k} className={"bcard" + (state === "locked" ? " off" : "")}>
              <Avatar url={avatarUrl} name={username} size={72} border={k} />
              <div className="px tagl">{b.label.toUpperCase()}</div>
              <div>Butuh {b.need} kartu berbeda</div>
              <div className="bar" style={{ width: "100%" }}><i style={{ width: `${state === "locked" ? pct : 100}%` }} /></div>
              <div style={{ color: "var(--mute)" }}>{state === "locked" ? `${Math.min(count, b.need)} / ${b.need}` : "Terbuka!"}</div>
              {state === "claimable" && <button className="big" disabled={busy !== null} onClick={() => claim(k)}>{busy === k ? "..." : "CLAIM"}</button>}
              {state === "owned" && <Link prefetch={false} href="/profile#border" className="abtn" style={{ fontSize: 10, padding: "12px 16px" }}>SUDAH DIKLAIM · PASANG</Link>}
              {state === "locked" && <button disabled>TERKUNCI</button>}
            </div>
          );
        })}
      </div>
      {msg && <p className="msg" role="status" style={{ color: "#ff6b6b" }}>{msg}</p>}
    </>
  );
}
