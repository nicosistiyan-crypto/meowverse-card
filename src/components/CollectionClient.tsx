"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Card from "./Card";
import Sprite from "./Sprite";
import { TIER, type PublicCard, type TierKey } from "@/lib/types";

const FILTERS: ("ALL" | TierKey)[] = ["ALL", "C", "B", "A", "S", "S_PLUS", "PRIME", "ABSOLUTE", "COLLECTOR"];
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function CollectionClient({ cards, ownedCount }: { cards: PublicCard[]; ownedCount: number }) {
  const [flt, setFlt] = useState<"ALL" | TierKey>("ALL");
  const [sel, setSel] = useState<PublicCard | null>(null);
  const total = cards.length;

  const list = useMemo(() => {
    // Unowned cards have no tier on the client, so tier filters only apply to owned cards.
    const a = cards.filter((c) => flt === "ALL" || (c.owned && c.tier === flt));
    const rank = (c: PublicCard) => (c.owned && c.tier ? TIER[c.tier].rank : -1);
    return a.sort((x, y) => rank(y) - rank(x) || x.no - y.no);
  }, [cards, flt]);

  const t = sel?.owned && sel.tier ? TIER[sel.tier] : null;
  return (
    <>
      <h2>CAT COLLECTION {ownedCount} / {total}</h2>
      <div className="row">
        {FILTERS.map((f) => (
          <button key={f} className={f === flt ? "on" : ""} onClick={() => setFlt(f)}>{f === "ALL" ? "ALL" : TIER[f].label}</button>
        ))}
        <span className="rowr">
          <Link prefetch={false} className="lnkb" href="/sell">JUAL</Link>
          <Link prefetch={false} className="lnkb" href="/fusion">FUSHION</Link>
          <Link prefetch={false} className="lnkb" href="/gift">GIFT</Link>
        </span>
      </div>
      {list.length === 0 ? (
        <div className="empty">Belum ada kartu di filter ini. Buka pack untuk mendapatkannya.</div>
      ) : (
        <div className="grid">{list.map((c) => <Card key={c.id} card={c} total={total} onClick={() => setSel(c)} />)}</div>
      )}
      {sel && (
        <div className="ov on" onClick={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="panelm">
            <div className={"card " + (t ? t.cls : "lock")} style={{ cursor: "default", marginBottom: 10 }}>
              <Sprite data={sel.sprite} sil={!sel.owned} />
            </div>
            <h3>{sel.owned ? sel.name!.toUpperCase() : "???"}</h3>
            <p>
              Tier: {t ? `${t.label} (${t.name})` : "?"}<br />
              Collection: #{String(sel.no).padStart(3, "0")} / {total}<br />
              Owned: {sel.owned ? "Yes" : "No"}
              {sel.owned && sel.obtainedAt && <><br />Obtained: {fmt(sel.obtainedAt)}</>}
            </p>
            <p style={{ color: "var(--mute)" }}>{sel.owned ? sel.description : "Buka pack untuk menemukan kartu ini."}</p>
            <div className="row"><button onClick={() => setSel(null)}>TUTUP</button></div>
          </div>
        </div>
      )}
    </>
  );
}
