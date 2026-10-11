"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Avatar from "./Avatar";
import type { ChatMsg, ChatPeer, Conv } from "@/lib/types";

const MAX = 300;
const SYS = "_sys";
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string): string {
  const d = new Date(iso), now = new Date(), y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === now.toDateString()) return "HARI INI";
  if (d.toDateString() === y.toDateString()) return "KEMARIN";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}
function listTime(iso: string): string {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return hhmm(iso);
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
type Row = ChatMsg & { pending?: boolean };

// CHAT: a WhatsApp-style messenger. Left = conversations, right = the open chat (on a phone they are two screens).
// The open chat refreshes every 3 s and the list every 6 s; Nav.tsx keeps ringing the bell for chats that are not open.
export default function ChatClient({ initialConvs, initialOpen }: { initialConvs: Conv[]; initialOpen: string }) {
  const [convs, setConvs] = useState(initialConvs);
  const [active, setActive] = useState<string | null>(initialOpen || null);   // username, SYS, or null (list only)
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [peer, setPeer] = useState<ChatPeer | null>(null);   // the other player's photo + border
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [find, setFind] = useState("");
  const [bump, setBump] = useState(0);            // re-triggers the send-button animation
  const known = useRef(new Set<number>());
  const activeRef = useRef(active); activeRef.current = active;
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const tmp = useRef(-1);

  const loadConvs = useCallback(async () => {
    if (document.hidden) return;
    try { const r = await fetch("/api/messages", { cache: "no-store" }); if (r.ok) setConvs((await r.json()).convs); } catch { /* offline */ }
  }, []);

  const loadThread = useCallback(async (who: string, first = false) => {
    if (document.hidden && !first) return;
    try {
      const r = await fetch("/api/messages?with=" + encodeURIComponent(who), { cache: "no-store" });
      if (activeRef.current !== who) return;
      if (r.status === 404) { setErr("Pemain dengan username itu tidak ditemukan."); setActive(null); return; }
      if (!r.ok) return;
      const d: { msgs: ChatMsg[]; peer?: ChatPeer | null } = await r.json();
      setPeer((old) => (d.peer && (old?.avatarUrl !== d.peer.avatarUrl || old?.border !== d.peer.border) ? d.peer : old));
      const incoming = d.msgs.filter((m) => !known.current.has(m.id)).map((m) => m.id);
      d.msgs.forEach((m) => known.current.add(m.id));
      if (!first && incoming.length) { setFresh(new Set(incoming)); setTimeout(() => setFresh(new Set()), 1200); }
      setRows((old) => { const pend = old.filter((o) => o.pending); return [...d.msgs, ...pend]; });
      setLoaded(true);
      if (first) loadConvs();
    } catch { /* offline */ }
  }, [loadConvs]);

  // open / switch a chat
  useEffect(() => {
    known.current = new Set(); setRows([]); setPeer(null); setLoaded(false); setFresh(new Set()); stick.current = true; setDraft("");
    if (active) loadThread(active, true);
  }, [active, loadThread]);

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { n++; if (activeRef.current) loadThread(activeRef.current); if (!activeRef.current || n % 2 === 0) loadConvs(); }, 3000);
    const vis = () => { if (!document.hidden) { loadConvs(); if (activeRef.current) loadThread(activeRef.current); } };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [loadThread, loadConvs]);

  // keep the newest message in view (only when the reader is already at the bottom, or just sent something)
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: loaded ? "smooth" : "auto" });
  }, [rows, loaded]);
  const onScroll = () => { const el = scroller.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  async function send() {
    const body = draft.trim();
    if (!body || !active || active === SYS) return;
    const to = active, id = tmp.current--;
    setErr(""); setDraft(""); setBump((b) => b + 1); stick.current = true;
    if (taRef.current) taRef.current.style.height = "auto";
    setRows((r) => [...r, { id, mine: true, body, at: new Date().toISOString(), read: false, pending: true }]);
    setFresh(new Set([id])); setTimeout(() => setFresh(new Set()), 800);
    const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, text: body }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setRows((r) => r.filter((x) => x.id !== id)); setDraft(body);
      setErr(d.error ?? "Gagal mengirim pesan. Coba lagi.");
      return;
    }
    if (d.id) known.current.add(d.id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, id: d.id ?? id, pending: false } : x)));
    loadConvs();
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(); }
  }
  function grow(e: FormEvent<HTMLTextAreaElement>) { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }
  function openNew() {
    const u = find.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setErr("Username: 3-20 karakter, huruf, angka, underscore."); return; }
    setErr(""); setFind(""); setNewOpen(false); setActive(u);
  }

  const total = convs.reduce((s, c) => s + c.unread, 0);
  const title = active === SYS ? "SISTEM" : active ? "@" + active : "";
  const canSend = draft.trim().length > 0;
  let lastDay = "";

  return (
    <div className={"wa" + (active ? " open" : "")}>
      {/* ---------------- conversation list ---------------- */}
      <aside className="wa-side">
        <div className="wa-top">
          <b className="wa-title">CHAT{total > 0 && <i className="wa-bd">{total > 9 ? "9+" : total}</i>}</b>
          <button className={"wa-ic" + (newOpen ? " on" : "")} aria-label="Chat baru" onClick={() => { setNewOpen((v) => !v); setErr(""); }}>＋</button>
        </div>
        {newOpen && (
          <div className="wa-new">
            <input autoFocus placeholder="username pemain" maxLength={21} value={find} onChange={(e) => setFind(e.target.value.toLowerCase())} onKeyDown={(e) => { if (e.key === "Enter") openNew(); }} />
            <button onClick={openNew}>BUKA</button>
          </div>
        )}
        {err && !active && <p className="err wa-err" role="alert">{err}</p>}
        <div className="wa-list">
          {convs.length === 0 ? (
            <div className="wa-empty"><span className="wa-bob">✉</span>Belum ada chat.<br />Tekan ＋ untuk menyapa pemain lain, atau cari username di menu <Link prefetch={false} href="/players">CARI</Link>.</div>
          ) : convs.map((c, i) => {
            const key = c.who ?? SYS;
            return (
              <button key={key} className={"wa-item" + (active === key ? " on" : "") + (c.unread ? " un" : "")} style={{ animationDelay: `${Math.min(i, 9) * 0.045}s` }} onClick={() => { setErr(""); setActive(key); }}>
                {c.who ? <Avatar url={c.avatarUrl} border={c.border} name={c.who} size={46} /> : <span className="wa-sys" aria-hidden>🔔</span>}
                <span className="wa-mid">
                  <span className="wa-name">{c.who ? "@" + c.who : "SISTEM"}</span>
                  <span className="wa-prev">{c.mine && <em>Kamu: </em>}{c.last}</span>
                </span>
                <span className="wa-meta"><time>{listTime(c.at)}</time>{c.unread > 0 && <i className="wa-bd">{c.unread > 9 ? "9+" : c.unread}</i>}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ---------------- open chat ---------------- */}
      <section className="wa-pane" key={active ?? "none"}>
        {!active ? (
          <div className="wa-none"><span className="wa-cat">😺</span><b>PIXEL CHAT</b><p>Pilih percakapan di kiri, atau mulai chat baru dengan tombol ＋.</p></div>
        ) : (
          <>
            <header className="wa-head">
              <button className="wa-back" aria-label="Kembali" onClick={() => setActive(null)}>◀</button>
              {active === SYS ? <span className="wa-sys" aria-hidden>🔔</span> : <Avatar url={peer?.avatarUrl} border={peer?.border} name={active} size={40} />}
              <span className="wa-hm"><b>{title}</b>{active === SYS ? <small>pemberitahuan game</small> : <small><Link prefetch={false} href={`/u/${active}`}>lihat profil</Link></small>}</span>
            </header>
            <div className="wa-body" ref={scroller} onScroll={onScroll}>
              {!loaded && <div className="wa-load"><i /><i /><i /></div>}
              {loaded && rows.length === 0 && <div className="wa-hello">Belum ada pesan.<br />Ketik sesuatu untuk menyapa {title} 👋</div>}
              {rows.map((m, i) => {
                const dk = dayKey(m.at), sep = dk !== lastDay; lastDay = dk;
                const lastOfGroup = i === rows.length - 1 || rows[i + 1].mine !== m.mine || dayKey(rows[i + 1].at) !== dk;
                const tail = i === 0 || rows[i - 1].mine !== m.mine || sep;
                return (
                  <div key={m.id} className="wa-r">
                    {sep && <div className="wa-day"><span>{dayLabel(m.at)}</span></div>}
                    <div className={"wa-line " + (m.mine ? "me" : "them")}>
                    {!m.mine && active !== SYS && (lastOfGroup ? <span className="wa-av"><Avatar url={peer?.avatarUrl} border={peer?.border} name={active} size={34} /></span> : <span className="wa-av sp" aria-hidden />)}
                    <div className={"wa-b " + (m.mine ? "me" : "them") + (tail ? " tl" : "") + (fresh.has(m.id) ? " new" : "")} style={loaded && fresh.size === 0 ? { animationDelay: `${Math.min(i, 12) * 0.03}s` } : undefined}>
                      <span className="wa-tx">{m.body}</span>
                      <span className="wa-tm">{hhmm(m.at)}{m.mine && <em className={m.pending ? "pd" : m.read ? "rd" : ""}>{m.pending ? "◔" : m.read ? "✓✓" : "✓"}</em>}</span>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {err && active && <p className="err wa-err" role="alert">{err}</p>}
            {active === SYS ? <div className="wa-ro">Ini pemberitahuan otomatis dari game, kamu tidak bisa membalasnya.</div> : (
              <div className="wa-bar">
                <textarea ref={taRef} rows={1} maxLength={MAX} placeholder="Ketik pesan" value={draft} onChange={(e) => setDraft(e.target.value)} onInput={grow} onKeyDown={onKey} />
                {draft.length > MAX - 60 && <span className="wa-cnt">{MAX - draft.length}</span>}
                <button key={bump} className={"wa-send" + (canSend ? " go" : "")} disabled={!canSend} aria-label="Kirim" onClick={send}>➤</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
