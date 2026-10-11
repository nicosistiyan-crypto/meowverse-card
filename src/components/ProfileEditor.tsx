"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Avatar from "./Avatar";
import Card from "./Card";
import ShowcaseSlab from "./ShowcaseSlab";
import { BORDERS, BORDER_KEYS, isBorder, type BorderKey, type PublicCard } from "@/lib/types";

type Props = { username: string; avatarUrl: string | null; bio: string; border: string | null; claimed: string[]; waiting: number; count: number; fresh: string | null; cards: PublicCard[]; total: number; showcase: number[] };

export default function ProfileEditor({ username, avatarUrl, bio, border, claimed, waiting, count, fresh, cards, total, showcase }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(avatarUrl);
  const [text, setText] = useState(bio);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [eq, setEq] = useState<string | null>(border);
  const [sel, setSel] = useState<number[]>(showcase);
  const [toast, setToast] = useState("");
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); }, [toast]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setMsg("");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setUrl(d.url); setMsg("Foto profil diperbarui."); router.refresh(); } else setMsg(d.error ?? "Upload gagal.");
    setBusy(false); e.target.value = "";
  }
  async function saveBio() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/profile/bio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio: text }) });
    setMsg(r.ok ? "Bio disimpan." : (await r.json().catch(() => ({}))).error ?? "Gagal menyimpan.");
    setBusy(false); if (r.ok) { setToast("Bio berhasil disimpan!"); router.refresh(); }
  }
  async function equip(b: BorderKey | null) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/profile/border", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ border: b }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setEq(b); setMsg(b ? `${BORDERS[b].label} dipasang.` : "Border dilepas."); router.refresh(); } else setMsg(d.error ?? "Gagal memasang border.");
    setBusy(false);
  }
  function toggle(id: number) {
    setSel((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 12) { setMsg("Maksimal 12 kartu yang dapat dipajang."); return cur; }
      setMsg(""); return [...cur, id];
    });
  }
  async function saveShowcase() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/profile/showcase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Pameran disimpan." : d.error ?? "Gagal menyimpan pameran.");
    setBusy(false); if (r.ok) { setToast("Pameran berhasil disimpan!"); router.refresh(); }
  }
  // arriving from the Claim menu (/profile?new=..#border): bring the border section into view
  useEffect(() => { const h = window.location.hash; if (h === "#border" || h === "#pameran") document.getElementById(h.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);

  return (
    <>
      <h2>EDIT PROFIL</h2>
      <div className="prof"><Avatar url={url} name={username} size={96} border={eq} />
        <label>Foto profil (PNG, JPG, WEBP, maks 2 MB)
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} />
        </label>
      </div>
      <h2>Bio</h2>
      <textarea rows={3} maxLength={160} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row"><button onClick={saveBio} disabled={busy}>SIMPAN BIO</button><Link prefetch={false} href={`/u/${username}`}>Lihat profil publik</Link></div>
      <h2 id="border">BORDER PROFIL</h2>
      <p className="msg">Kartu unikmu: {count} (duplikat tidak dihitung). Border yang sudah diklaim tetap kamu miliki walau koleksimu berkurang.{waiting > 0 && <> <Link prefetch={false} href="/claim">Ada {waiting} border yang menunggu di menu CLAIM!</Link></>}</p>
      <div className="bcards">
        <div className={"bcard" + (eq === null ? " new" : "")}>
          <Avatar url={url} name={username} size={64} />
          <div className="px tagl">TANPA BORDER</div>
          <button disabled={busy || eq === null} onClick={() => equip(null)}>{eq === null ? "DIPASANG" : "LEPAS BORDER"}</button>
        </div>
        {BORDER_KEYS.map((k) => {
          const b = BORDERS[k], has = claimed.includes(k);
          return (
            <div key={k} className={"bcard" + (has ? "" : " off") + (fresh === k ? " new" : "")}>
              <Avatar url={url} name={username} size={64} border={k} />
              <div className="px tagl">{b.label.toUpperCase()}{fresh === k ? " · BARU!" : ""}</div>
              <div style={{ color: "var(--mute)" }}>{has ? `Dari ${b.need} kartu` : `Terkunci · ${b.need} kartu`}</div>
              {has
                ? <button className={eq === k ? "" : "big"} disabled={busy || eq === k} onClick={() => equip(k)}>{eq === k ? "DIPASANG" : "PASANG"}</button>
                : <Link prefetch={false} href="/claim" className="abtn" style={{ fontSize: 10, padding: "12px 16px" }}>KE MENU CLAIM</Link>}
            </div>
          );
        })}
      </div>
      <h2 id="pameran">PAMERAN KARTU ({sel.length} / 12)</h2>
      <p className="msg">Pilih sampai 12 kartu untuk dipajang di profilmu. Kartu yang dipajang tampil di dalam plastik bening eksklusif. Urutan pilihan = urutan tampil.</p>
      {sel.length > 0 && <div className="grid" style={{ marginBottom: 14 }}>{sel.map((id) => { const c = cards.find((x) => x.id === id); return c ? <ShowcaseSlab key={id} card={c} total={total} /> : null; })}</div>}
      <div className="row"><button className="big" onClick={saveShowcase} disabled={busy}>SIMPAN PAMERAN</button><button onClick={() => setSel([])} disabled={busy || !sel.length}>KOSONGKAN</button></div>
      <h2>Pilih kartu</h2>
      {cards.length ? <div className="grid">{cards.map((c) => { const i = sel.indexOf(c.id); return (
        <div key={c.id} className={"pickc" + (i >= 0 ? " sel" : "")} style={{ position: "relative" }}>
          <Card card={c} total={total} onClick={() => toggle(c.id)} />
          {i >= 0 && <span className="shbadge">{i + 1}</span>}
        </div>); })}</div>
        : <div className="empty">Kamu belum punya kartu untuk dipajang.</div>}
      {msg && <p className="msg" role="status">{msg}</p>}
      {toast && <div className="toast-ok" role="status" aria-live="polite">✔ {toast}</div>}
    </>
  );
}
