"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Crown from "./Crown";
import { refreshWallet } from "@/lib/wallet";
import { BORDERS, BORDER_KEYS, REWARDS, REWARD_KEYS, type BorderKey, type RewardKey } from "@/lib/types";

type Row = { border: string; claimed: boolean };
type RewardRow = { reward: string; claimed: boolean };

export default function ClaimClient({ username, avatarUrl, count, rows, rewards, rewardsMissing }: { username: string; avatarUrl: string | null; count: number; rows: Row[]; rewards: RewardRow[]; rewardsMissing?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<BorderKey | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [rbusy, setRbusy] = useState<RewardKey | null>(null);

  async function claimReward(k: RewardKey) {
    setRbusy(k); setMsg(""); setOk("");
    const r = await fetch("/api/claim/reward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reward: k }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setOk(d.coins > 0 ? `✔ ${Number(d.coins).toLocaleString("id-ID")} coin masuk ke saldomu!` : "✔ Mahkota diklaim! Sekarang tampil di kanan username-mu.");
      refreshWallet(); router.refresh();
    } else setMsg(d.error ?? "Gagal mengklaim.");
    setRbusy(null);
  }

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
      <h2 style={{ fontSize: 14 }}>HADIAH</h2>
      {rewardsMissing && <p className="msg" role="alert" style={{ color: "#ff6b6b" }}>Hadiah belum aktif di database. Admin: jalankan supabase/stage18.sql di Supabase SQL Editor.</p>}
      <div className="rlist">
        {REWARD_KEYS.map((k) => {
          const R = REWARDS[k], row = rewards.find((r) => r.reward === k);
          const state = row?.claimed ? "owned" : row ? "claimable" : "locked";
          return (
            <div key={k} className={"rcard" + (state === "locked" ? " off" : "")}>
              <div className="rinfo">
                <div className="px tagl">{R.label.toUpperCase()}{k === "CROWN" && <Crown show size={3} />}</div>
                <div>{R.how}</div>
                <div style={{ color: "var(--mute)" }}>{R.coins > 0 ? `Hadiah: ${R.coins.toLocaleString("id-ID")} coin` : "Hadiah: simbol mahkota di kanan username"}</div>
              </div>
              {state === "claimable" && <button className="big" disabled={rbusy !== null} onClick={() => claimReward(k)}>{rbusy === k ? "..." : "CLAIM"}</button>}
              {state === "owned" && <button disabled>SUDAH DIKLAIM</button>}
              {state === "locked" && <button disabled>TERKUNCI</button>}
            </div>
          );
        })}
      </div>
      {ok && <p className="msg" role="status" style={{ color: "#3ddc84" }}>{ok}</p>}
      <h2 style={{ fontSize: 14 }}>BORDER PROFIL</h2>
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
