"use client";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import RevealFx, { FX } from "./RevealFx";
import FlipCard, { TIER_COLOR } from "./FlipCard";
import { audio } from "@/lib/audio";
import { TIER, FUSABLE, type PublicCard, type TierKey } from "@/lib/types";

type Copy = { rowId: number; card: PublicCard };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function FusionClient({ copies, chances, bonus }: { copies: Copy[]; chances: Record<string, number>; bonus: { PRIME: number; ABSOLUTE: number } }) {
  const router = useRouter();
  const [sel, setSel] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "fusing" | "ultra" | "result" | "error">("idle");
  const [res, setRes] = useState<{ upgraded: boolean; kind: string; card: PublicCard } | null>(null);
  const [msg, setMsg] = useState("");
  const [qk, setQk] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [from, setFrom] = useState<TierKey | null>(null);
  const byId = (id: number) => copies.find((c) => c.rowId === id)!;
  const lock: TierKey | null = sel.length ? byId(sel[0]).card.tier! : null;

  const toggle = (c: Copy) => setSel((s) =>
    s.includes(c.rowId) ? s.filter((x) => x !== c.rowId)
    : s.length < 3 && (!lock || lock === c.card.tier) ? [...s, c.rowId] : s);

  async function fuse() {
    setFrom(lock);
    audio.unlock(); audio.fuseCharge(2600);
    setPhase("fusing");
    const [r] = await Promise.all([
      fetch("/api/fusion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: sel }) }),
      sleep(2600),
    ]);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(data.error ?? "Fusi gagal."); setPhase("error"); return; }
    setRes(data);
    audio.fuseImpact();
    const tier: TierKey | undefined = data.card?.tier;
    const fx = tier ? FX[tier] : undefined;
    setFlipped(false);
    if (fx && tier) {                          // S+ and above get the same build-up as in the packs
      setPhase("ultra"); setQk(fx.quake);
      audio.buildup(tier, fx.ms * 0.8);
      await sleep(fx.ms * 0.8);
      setQk(""); audio.impact(tier);
      await sleep(fx.ms * 0.2);
    }
    setPhase("result");
    audio.fuseResult(data.kind, !!data.upgraded);
    await sleep(900);                          // banner first, then the card turns over
    setFlipped(true);
    if (tier) audio.reveal(tier);
  }
  function close() { setPhase("idle"); setSel([]); setRes(null); router.refresh(); }

  const chance = lock ? chances[lock] ?? 0 : null;
  return (
    <>
      <h2>FUSI KARTU</h2>
      <p className="msg">Gabungkan 3 kartu bertier sama (C sampai S+). Ketiganya hilang, lalu kamu dapat 1 kartu acak: ada peluang naik ke tier berikutnya, kalau gagal tetap di tier yang sama. Selain itu, setiap fusi punya peluang langsung mendapat kartu Prime ({bonus.PRIME}%) atau Absolute ({bonus.ABSOLUTE}%), apa pun tier kartu yang difusi. Kartu Prime dan Absolute sendiri tidak bisa difusi.</p>
      <p className="msg">Peluang naik tier: {FUSABLE.map((t) => `${TIER[t].label} ${chances[t] ?? 0}%`).join(" · ")}</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "12px 0" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="slotf">{sel[i] ? <Card card={byId(sel[i]).card} total={0} /> : "Slot kosong"}</div>
        ))}
      </div>
      <button className="big" disabled={sel.length !== 3 || phase !== "idle"} onClick={fuse}>
        FUSI {sel.length}/3{chance !== null ? ` (naik tier ${chance}%)` : ""}
      </button>
      <h2>Kartumu</h2>
      {copies.length === 0 ? <div className="empty">Belum ada kartu yang bisa difusi. Buka pack dulu!</div> : (
        <div className="grid">
          {copies.map((c) => {
            const on = sel.includes(c.rowId);
            const dim = !on && ((lock && lock !== c.card.tier) || sel.length >= 3);
            return (
              <div key={c.rowId} className={"pickc" + (on ? " sel" : "") + (dim ? " dim" : "")}>
                <Card card={c.card} total={0} onClick={() => toggle(c)} />
              </div>
            );
          })}
        </div>
      )}

      {phase !== "idle" && (
        <div className={"ov on" + (phase === "ultra" ? " dark " + qk : "")}>
          {phase === "fusing" && (
            <>
              <div className="vx">
                <div className="vx-dark" />
                {[0, 1, 2].map((i) => <div key={i} className="vx-ring" style={{ "--d": `${0.5 + i * 0.5}s` } as CSSProperties} />)}
                <div className="vx-spin">
                  {sel.map((id, i) => (
                    <div key={id} className="vx-a" style={{ "--a": `${i * 120}deg` } as CSSProperties}><Card card={byId(id).card} total={0} /></div>
                  ))}
                </div>
                {Array.from({ length: 18 }, (_, i) => (
                  <i key={i} className="vx-p" style={{ "--a": `${i * 20}deg`, "--d": `${(i % 6) * 0.3}s` } as CSSProperties} />
                ))}
                <div className="vx-orb" />
              </div>
              <div className="px" style={{ fontSize: 11 }}>FUSING...</div>
              <div className="vx-flash" />
            </>
          )}
          {phase === "ultra" && res?.card.tier && <RevealFx tier={res.card.tier} />}
          {phase === "error" && <><p>{msg}</p><button onClick={close}>OK</button></>}
          {phase === "result" && res && (
            <>
              <div className="vr-after" />
              <div className={"vr-banner " + (res.kind === "bonus" ? "bonus" : res.upgraded ? "up" : "same")}>
                {res.kind === "bonus" ? "★ JACKPOT ★" : res.upgraded ? "TIER NAIK!" : "TIER SAMA"}
              </div>
              {from && (
                <div className="vr-chips">
                  <span style={{ borderColor: TIER_COLOR[from] }}>{TIER[from].label}</span>
                  <i>{res.kind === "bonus" || res.upgraded ? "▶▶" : "＝"}</i>
                  <span className="to" style={{ borderColor: TIER_COLOR[res.card.tier!], color: TIER_COLOR[res.card.tier!] }}>{TIER[res.card.tier!].label}</span>
                </div>
              )}
              {res.kind === "bonus" && Array.from({ length: 22 }, (_, i) => (
                <i key={i} className="vr-conf" style={{ left: `${(i * 37) % 100}%`, "--d": `${(i % 7) * 0.15}s`, background: ["#ffd23f", "#ff4081", "#40c4ff", "#fff"][i % 4] } as CSSProperties} />
              ))}
              <div className="cwrap"><FlipCard card={res.card} flipped={flipped} /></div>
              <div className={"cinfo" + (flipped ? " on" : "")}>
                <div className="px" style={{ fontSize: 11, color: TIER_COLOR[res.card.tier!] }}>{res.card.name!.toUpperCase()}</div>
                <div>{TIER[res.card.tier!].name}</div>
              </div>
              <button disabled={!flipped} onClick={close}>OK</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
