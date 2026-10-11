"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import type { Msg } from "@/lib/types";

type Tab = "in" | "out" | "new";
const MAX = 300;
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

// NOTIF = a small mailbox between players. The inbox holds system notifications (gifts, borders) and messages from other players;
// it refreshes itself every 8 s and new messages slide in. Nav.tsx already rings the bell when something new arrives.
export default function InboxClient({ initialInbox, initialSent, initialTo }: { initialInbox: Msg[]; initialSent: Msg[]; initialTo: string }) {
  const [tab, setTab] = useState<Tab>(initialTo ? "new" : "in");
  const [inbox, setInbox] = useState(initialInbox);
  const [sent, setSent] = useState(initialSent);
  const [to, setTo] = useState(initialTo);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [flying, setFlying] = useState(false);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const seen = useRef(new Set(initialInbox.map((m) => m.id)));
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    try {
      const r = await fetch("/api/messages" + (tabRef.current === "in" ? "?seen=1" : ""), { cache: "no-store" });
      if (!r.ok) return;
      const d: { inbox: Msg[]; sent: Msg[] } = await r.json();
      const incoming = d.inbox.filter((m) => !seen.current.has(m.id)).map((m) => m.id);
      if (incoming.length) { incoming.forEach((id) => seen.current.add(id)); setFresh(new Set(incoming)); setTimeout(() => setFresh(new Set()), 2500); }
      setInbox(d.inbox); setSent(d.sent);
    } catch { /* offline: try again next tick */ }
  }, []);
  useEffect(() => {
    const id = setInterval(refresh, 8000);
    const vis = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [refresh]);

  async function send() {
    const name = to.trim().toLowerCase(), body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: name, text: body }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? "Gagal mengirim pesan."); return; }
    setFlying(true); setText("");
    setTimeout(() => { setFlying(false); setTab("out"); }, 900);
    refresh();
  }
  const reply = (who: string) => { setTo(who); setText(""); setErr(""); setTab("new"); };
  const unread = inbox.filter((m) => m.unread).length;
  const canSend = /^[a-z0-9_]{3,20}$/.test(to.trim()) && text.trim().length > 0 && !busy;

  return (
    <>
      <h2>PESAN &amp; NOTIFIKASI</h2>
      <div className="mtabs" role="tablist">
        <button role="tab" aria-selected={tab === "in"} className={tab === "in" ? "on" : ""} onClick={() => setTab("in")}>MASUK{unread ? <i className="mn">{unread > 9 ? "9+" : unread}</i> : null}</button>
        <button role="tab" aria-selected={tab === "out"} className={tab === "out" ? "on" : ""} onClick={() => setTab("out")}>TERKIRIM</button>
        <button role="tab" aria-selected={tab === "new"} className={tab === "new" ? "on" : ""} onClick={() => setTab("new")}>✉ TULIS</button>
      </div>

      {tab === "in" && (inbox.length === 0 ? <div className="empty">Belum ada pesan. Pesan dari pemain lain, kartu hadiah, dan border baru akan muncul di sini.</div> : (
        <div className="msgs">
          {inbox.map((m, i) => (
            <div key={m.id} className={"msg mrow" + (m.unread ? " unread" : "") + (fresh.has(m.id) ? " fresh" : "")} style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
              {m.who ? <Avatar name={m.who} size={40} /> : <span className="msys" aria-hidden>🔔</span>}
              <div className="mbody">
                <b className="mfrom">{m.who ? `@${m.who}` : "SISTEM"}</b>
                <div className="mtext">{m.body}</div>
                <time>{when(m.at)}</time>
                {m.who && m.kind === "dm" && <button className="mreply" onClick={() => reply(m.who!)}>↩ BALAS</button>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === "out" && (sent.length === 0 ? <div className="empty">Belum ada pesan terkirim. Buka tab TULIS untuk menyapa pemain lain.</div> : (
        <div className="msgs">
          {sent.map((m, i) => (
            <div key={m.id} className="msg mrow out" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
              <Avatar name={m.who ?? "?"} size={40} />
              <div className="mbody">
                <b className="mfrom">KE @{m.who}</b>
                <div className="mtext">{m.body}</div>
                <time>{when(m.at)}</time>
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === "new" && (
        <div className="compose">
          <label>Kepada
            <input placeholder="username penerima" maxLength={20} value={to} onChange={(e) => setTo(e.target.value.toLowerCase())} />
          </label>
          <label>Pesan
            <textarea rows={5} maxLength={MAX} placeholder="Tulis pesan untuk pemain lain..." value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="ccount">{text.length} / {MAX} · cari username di menu <a href="/players">CARI</a></div>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="big" disabled={!canSend} onClick={send}>{busy ? "MENGIRIM..." : "KIRIM PESAN"}</button>
          {flying && <div className="fly" aria-hidden>✉</div>}
        </div>
      )}
    </>
  );
}
