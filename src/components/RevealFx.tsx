"use client";
import type { CSSProperties } from "react";
import type { TierKey } from "@/lib/types";

// Reveal sequences for the four top tiers. Each one is longer and louder than the one before it,
// so the build-up itself tells the player how rare the card is: S+ < PRIME < ABSOLUTE < COLLECTOR.
export const FX: Partial<Record<TierKey, { title: string; sub: string; ms: number; quake: string; cls: string }>> = {
  S_PLUS: { title: "ULTRA RARE", sub: "S+ · MYTHIC", ms: 1800, quake: "quake", cls: "fxSp" },
  PRIME: { title: "PRIME", sub: "◆ DIAMOND CLASS ◆", ms: 2500, quake: "quake2", cls: "fxPr" },
  ABSOLUTE: { title: "ABSOLUTE", sub: "♛ THE CROWN BURNS ♛", ms: 3200, quake: "quake3", cls: "fxAb" },
  COLLECTOR: { title: "COLLECTOR", sub: "✦ ANIMATED SCENE CARD ✦", ms: 4200, quake: "quakeCo", cls: "fxCo" },
};

const n = (k: number, m: number) => (k * 37 + 11) % m;

export default function RevealFx({ tier }: { tier: TierKey }) {
  const fx = FX[tier];
  if (!fx) return null;
  const parts = Array.from({ length: 26 }, (_, k) => k);
  return (
    <div className={"fx " + fx.cls} style={{ "--T": fx.ms + "ms" } as CSSProperties}>
      <div className="fx-bg" />
      {tier === "COLLECTOR" && <div className="fx-spot" />}
      {[0, 1, 2].map((k) => <div key={k} className="fx-ring" style={{ animationDelay: `${0.5 + k * 0.35}s` }} />)}
      {parts.map((k) => (
        <i key={k} className="fx-p" style={{ left: `${n(k, 97)}%`, animationDelay: `${(k % 9) * 0.22}s`, animationDuration: `${1.6 + (k % 5) * 0.4}s`, "--s": `${6 + (k % 4) * 3}px` } as CSSProperties}>
          {tier === "PRIME" ? "◆" : tier === "COLLECTOR" ? (k % 3 === 0 ? "✦" : "") : ""}
        </i>
      ))}
      {tier === "ABSOLUTE" && <><div className="fx-fire" /><div className="fx-crown">♛</div></>}
      {tier === "PRIME" && <><div className="fx-gem g1">◆</div><div className="fx-gem g2">◆</div></>}
      {tier === "COLLECTOR" && <><div className="fx-cur l" /><div className="fx-cur r" /><div className="fx-frame" /></>}
      {tier === "COLLECTOR" && (
        // the moment the COLLECTOR title slams in (1.9s): gold light burst, shockwaves, lightning bolts and a spark burst
        <>
          <div className="fx-burst" />
          {[0, 1, 2].map((k) => <div key={k} className="fx-shock" style={{ animationDelay: `${1.9 + k * 0.17}s` }} />)}
          {[[8, 1.85, 1], [27, 2.0, -1], [66, 1.9, 1], [85, 2.05, -1]].map(([l, d, f], k) => (
            <svg key={k} className="fx-bolt" viewBox="0 0 40 100" preserveAspectRatio="none" style={{ left: `${l}%`, transform: `scaleX(${f})`, animationDelay: `${d}s` }}>
              <polygon points="24,0 6,42 19,42 8,100 34,36 21,36 36,0" />
            </svg>
          ))}
          {Array.from({ length: 28 }, (_, k) => (
            <i key={k} className="fx-sb" style={{ "--a": `${k * (360 / 28) + (k % 2) * 6}deg`, "--r": `${110 + (k % 4) * 45}px` } as CSSProperties} />
          ))}
        </>
      )}
      <div className="ttl">{fx.title}</div>
      <div className="sub">{fx.sub}</div>
      <div className="fx-flash" />
    </div>
  );
}
