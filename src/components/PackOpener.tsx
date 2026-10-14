"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import PackWrapArt, { PackBoxArt } from "./PackWrapArt";
import PackBanner from "./PackBanner";
import RevealFx, { FX } from "./RevealFx";
import FlipCard, { TIER_COLOR } from "./FlipCard";
import CollectorFly, { COLLECTOR_FLY_MS } from "./CollectorFly";
import CoinIcon from "./CoinIcon";
import VoucherIcon from "./VoucherIcon";
import { packKind } from "@/lib/packBanner";
import { audio } from "@/lib/audio";
import { refreshWallet } from "@/lib/wallet";
import { TIER, type PublicCard, type TierKey } from "@/lib/types";

type Pack = { id: number; name: string; cardCount: number; coinPrice: number; voucherKind: "blue" | "gold" | null; voucherCost: number; tiers: TierKey[] };
type Won = PublicCard & { isNew: boolean };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// energy sparks around the pack: they gather in while it charges and burst out when it tears
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return { x: Math.round(Math.cos(a) * (130 + (i % 3) * 28)), y: Math.round(Math.sin(a) * (150 + (i % 4) * 18)), d: (i % 9) * 0.11, c: ["#fff", "#ffd23f", "#ff6b9d", "#7ee8ff"][i % 4] };
});

// kemasan dengan desain yang sama seperti gambar pack-nya di menu PACK
function PackArt({ pack }: { pack: Pack }) {
  return (
    <div className="art wrapart">
      <PackWrapArt name={pack.name} tiers={pack.tiers} />
    </div>
  );
}

export default function PackOpener({ packs, coins, blue, gold }: { packs: Pack[]; coins: number; blue: number; gold: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "pack" | "box" | "tear" | "ultra" | "reveal" | "error">("idle");
  const [cur, setCur] = useState<Pack | null>(null);
  const [cards, setCards] = useState<Won[]>([]);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [qk, setQk] = useState("");
  const [flipped, setFlipped] = useState(false);

  async function show(c: Won) {
    const fx = c.tier ? FX[c.tier] : undefined;
    setFlipped(false);
    if (fx && c.tier) {
      setPhase("ultra");
      setQk(fx.quake);
      audio.buildup(c.tier, fx.ms * 0.8);
      await sleep(fx.ms * 0.8);
      setQk("");
      audio.impact(c.tier);
      await sleep(fx.ms * 0.2);
    }
    setPhase("reveal");
    if (c.tier === "COLLECTOR") { audio.collectorFly(COLLECTOR_FLY_MS); return; }   // the golden card flies in, then landCollector() turns it over
    await sleep(fx ? 280 : 480);            // the card shows its back first, then turns over
    setFlipped(true);
    if (c.tier) audio.reveal(c.tier);
  }
  async function landCollector() {
    audio.collectorLand();
    await sleep(450);                       // let the landing pop show before the card turns over
    setFlipped(true);
    audio.reveal("COLLECTOR");
  }
  async function open(packId: number) {
    const pk = packs.find((x) => x.id === packId);
    const box = !!pk && packKind(pk.name) === 3;       // Mv Pack 3: box terbuka -> 4 kemasan muncul -> kemasan disobek
    const wait = box ? 2800 : 1900;
    setCur(pk ?? null);
    audio.unlock(); audio.packCharge(wait);
    setPhase(box ? "box" : "pack"); setMsg("");
    const [res] = await Promise.all([
      fetch("/api/packs/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) }),
      sleep(wait),
    ]);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data.error ?? "Could not open the pack."); setPhase("error"); return; }
    setCards(data.cards); setIdx(0); setUnlocked(data.unlockedBorders ?? []);
    refreshWallet();                                  // the vouchers / coins for a paid pack are gone: update the badges now
    setPhase("tear");
    audio.packTear();
    if (box) [1, 2, 3].forEach((i) => setTimeout(() => audio.packTear(), i * 140));   // 4 kemasan disobek satu per satu
    await sleep(box ? 1900 : 1500);
    await show(data.cards[0]);
  }
  function next() { const n = idx + 1; setIdx(n); show(cards[n]); }
  function close() { setPhase("idle"); router.refresh(); }

  const c = cards[idx];
  const three = !!cur && packKind(cur.name) === 3;
  const GLOW: Partial<Record<TierKey, string>> = { S: "#ffb30099", S_PLUS: "#ff408899", PRIME: "#ff4f9acc", ABSOLUTE: "#ff3d00cc", COLLECTOR: "#ffd23fcc" };
  const glow = c?.tier ? GLOW[c.tier] ?? null : null;
  return (
    <>
      <h2>OPEN PACK</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        {packs.map((p) => (
          <div key={p.id} className="box" style={{ width: "auto" }}>
            <PackBanner name={p.name} tiers={p.tiers} />
            <h3>{p.name}</h3>
            <div>{p.cardCount} kartu per pack</div>
            {p.voucherKind
              ? <div className="pkprice"><VoucherIcon kind={p.voucherKind} size={20} /> {p.voucherCost} {p.voucherKind === "gold" ? "voucher emas" : "voucher biru"}</div>
              : p.coinPrice > 0
                ? <div className="pkprice"><CoinIcon size={20} /> {p.coinPrice.toLocaleString("id-ID")} coin</div>
                : <div className="pkprice free">GRATIS</div>}
            {(() => {
              const short = p.voucherKind ? (p.voucherKind === "gold" ? gold : blue) < p.voucherCost : p.coinPrice > coins;
              return <button className="big" disabled={phase !== "idle" || short} onClick={() => open(p.id)}>{short ? (p.voucherKind ? "VOUCHER KURANG" : "COIN KURANG") : "OPEN"}</button>;
            })()}
          </div>
        ))}
      </div>

      {phase !== "idle" && (
        <div className={"ov on" + (phase === "ultra" ? " dark " + qk : "")}
          style={phase === "reveal" && flipped && glow ? { background: `radial-gradient(circle,${glow},#000 70%)` } : undefined}>
          {(phase === "pack" || (phase === "tear" && !three)) && cur && (
            <>
              <div className={"pk2 " + (phase === "pack" ? "charge" : "tear")}>
                <div className="pk2-aura" />
                <div className="pk2-rays" />
                {phase === "tear" && [0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="pk2-card" style={{ "--d": `${0.12 + i * 0.09}s`, "--rot": `${(i - 2) * 13}deg` } as CSSProperties} />
                ))}
                <div className="pk2-body">
                  <div className="pkh pkb"><PackArt pack={cur} /></div>
                  <div className="pkh pkt"><PackArt pack={cur} /></div>
                  <div className="pk2-seam" />
                </div>
                {SPARKS.map((sp, i) => <i key={i} className="pk2-sp" style={{ "--x": `${sp.x}px`, "--y": `${sp.y}px`, "--d": `${sp.d}s`, "--c": sp.c } as CSSProperties} />)}
                {phase === "tear" && <div className="burst" />}
              </div>
              <div className="px" style={{ fontSize: 11 }}>{phase === "pack" ? "OPENING..." : ""}</div>
            </>
          )}
          {(phase === "box" || (phase === "tear" && three)) && cur && (
            <>
              {phase === "box" ? (
                <div className="bx">
                  <div className="bx-glow" />
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bx-pack" style={{ "--i": i, "--x": `${[-118, -39, 39, 118][i]}%`, "--r": `${[-9, -3, 3, 9][i]}deg` } as CSSProperties}>
                      <PackArt pack={cur} />
                    </div>
                  ))}
                  <PackBoxArt part="body" />
                  <PackBoxArt part="lid" />
                </div>
              ) : (
                <div className="bx-row">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="pk2 tear" style={{ "--td": `${i * 0.14}s` } as CSSProperties}>
                      <div className="pk2-rays" />
                      <div className="pk2-body">
                        <div className="pkh pkb"><PackArt pack={cur} /></div>
                        <div className="pkh pkt"><PackArt pack={cur} /></div>
                        <div className="pk2-seam" />
                      </div>
                      <div className="burst" />
                    </div>
                  ))}
                </div>
              )}
              <div className="px" style={{ fontSize: 11 }}>{phase === "box" ? "OPENING..." : ""}</div>
            </>
          )}
          {phase === "ultra" && c?.tier && <RevealFx tier={c.tier} />}
          {phase === "error" && <><p>{msg}</p><button onClick={close}>OK</button></>}
          {phase === "reveal" && c && (
            <>
              {c.tier === "COLLECTOR" ? (
                <CollectorFly key={idx} onLand={landCollector}>
                  <FlipCard card={c} flipped={flipped} />
                  {flipped && c.isNew && <div className="fnew">NEW!</div>}
                </CollectorFly>
              ) : (
                <div key={idx} className="cwrap">
                  <FlipCard card={c} flipped={flipped} />
                  {flipped && c.isNew && <div className="fnew">NEW!</div>}
                </div>
              )}
              <div className={"cinfo" + (flipped ? " on" : "")}>
                <div className="px" style={{ fontSize: 11, color: TIER_COLOR[c.tier!] }}>{c.name!.toUpperCase()}</div>
                <div>{TIER[c.tier!].name} · {c.isNew ? "NEW!" : "Duplikat"}</div>
              </div>
              <div className="cdots">{cards.map((_, i) => <i key={i} className={i === idx ? "now" : i < idx ? "done" : ""} />)}</div>
              {flipped && idx === cards.length - 1 && unlocked.length > 0 && (
                <Link prefetch={false} className="unl" href="/claim">🎁 {unlocked.map((b) => (b === "PURPLE" ? "Border Ungu" : b === "RED" ? "Border Merah" : "Border Emas")).join(", ")} bisa diklaim! → CLAIM</Link>
              )}
              {idx < cards.length - 1
                ? <button disabled={!flipped} onClick={next}>NEXT ({idx + 1}/{cards.length})</button>
                : <button disabled={!flipped} onClick={close}>OK</button>}
            </>
          )}
        </div>
      )}
    </>
  );
}
