"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The green dot on NOTIF (and the gold one on CLAIM) is checked every 15 s. When the number goes UP the dot pops,
// rings out and the menu label shakes like a bell, so a new message is noticed even without opening the menu.
export default function Nav({ me, unread: u0, claimable: c0 }: { me: string; unread: number; claimable: number }) {
  const path = usePathname();
  const [unread, setUnread] = useState(u0);
  const [claimable, setClaimable] = useState(c0);
  const [fresh, setFresh] = useState<"" | "msg" | "claim">("");
  const prev = useRef({ u: u0, c: c0 });

  useEffect(() => {
    let alive = true, t: ReturnType<typeof setTimeout> | undefined;
    const bump = (k: "msg" | "claim") => { setFresh(k); clearTimeout(t); t = setTimeout(() => setFresh(""), 4000); };
    async function poll() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (d.unread > prev.current.u) bump("msg"); else if (d.claimable > prev.current.c) bump("claim");
        prev.current = { u: d.unread, c: d.claimable };
        setUnread(d.unread); setClaimable(d.claimable);
      } catch { /* offline: try again next tick */ }
    }
    const id = setInterval(poll, 15000);
    // right after opening NOTIF / CLAIM the numbers change, so refresh the dots quickly there
    const first = setTimeout(poll, /^\/(notifikasi|claim)/.test(path) ? 800 : 4000);
    const vis = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(id); clearTimeout(first); clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
  }, [path]);
  // the server numbers are the truth after every navigation
  useEffect(() => { setUnread(u0); setClaimable(c0); prev.current = { u: u0, c: c0 }; }, [u0, c0]);

  const links: [string, string][] = [["/home", "HOME"], ["/pack", "PACK"], ["/collection", "KARTU"], ["/notifikasi", "CHAT"], ["/players", "CARI"], [`/u/${me}`, "PROFIL"]];
  const badge = (href: string) => {
    const n = href === "/notifikasi" ? unread : href === "/claim" ? claimable : 0;
    if (!n) return null;
    const isNew = (href === "/notifikasi" && fresh === "msg") || (href === "/claim" && fresh === "claim");
    return <span className={"dotn" + (href === "/claim" ? " gold" : "") + (isNew ? " new" : "")} aria-label={`${n} baru`}>{n > 9 ? "9+" : n}</span>;
  };
  return (
    <nav>
      {links.map(([href, label]) => {
        const on = path === href || (href !== `/u/${me}` && path.startsWith(href));
        const shake = (href === "/notifikasi" && fresh === "msg") || (href === "/claim" && fresh === "claim");
        // Link = client-side navigation: the page is not reloaded, so the background music keeps playing between menus
        return <Link key={href} href={href} prefetch={false} className={(on ? "on" : "") + (shake ? " shake" : "")}>{label}{badge(href)}</Link>;
      })}
    </nav>
  );
}
