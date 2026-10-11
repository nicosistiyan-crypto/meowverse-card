"use client";
import type { CSSProperties } from "react";
import Card from "./Card";
import type { PublicCard, TierKey } from "@/lib/types";

export const TIER_COLOR: Record<TierKey, string> = {
  C: "#9aa5b1", B: "#4fc3f7", A: "#66bb6a", S: "#ffb300", S_PLUS: "#ff4081", PRIME: "#ff4f9a", ABSOLUTE: "#ff3d00", COLLECTOR: "#ffd23f",
};

// A card that starts face down (its edge already hints at the rarity) and turns over in 3D when `flipped` becomes true.
export default function FlipCard({ card, flipped }: { card: PublicCard; flipped: boolean }) {
  const t: TierKey = card.tier ?? "C";
  const hi = t === "S" || t === "S_PLUS" || t === "PRIME" || t === "ABSOLUTE" || t === "COLLECTOR";
  return (
    <div className={"flipc" + (flipped ? " on" : "") + (hi ? " hi" : "")} style={{ "--tc": TIER_COLOR[t] } as CSSProperties}>
      <div className="fglow" />
      <div className="fi fback"><div className="fbk">?</div></div>
      <div className="fi ffront"><Card card={card} total={0} /></div>
      <div className="fring" />
    </div>
  );
}
