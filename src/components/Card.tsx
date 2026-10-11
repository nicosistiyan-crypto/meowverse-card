"use client";
import Sprite from "./Sprite";
import { TIER, type PublicCard } from "@/lib/types";

export default function Card({ card, total, onClick }: { card: PublicCard; total: number; onClick?: () => void }) {
  const t = card.owned && card.tier ? TIER[card.tier] : null;
  const no = String(card.no).padStart(3, "0");
  const tier = card.tier;
  const n = tier === "S_PLUS" ? 14 : tier === "S" ? 8 : tier === "PRIME" ? 12 : tier === "ABSOLUTE" ? 14 : tier === "COLLECTOR" ? 10 : 0;
  const pos = (k: number) => ({ left: `${(k * 37) % 88}%`, animationDelay: `${k * 0.3}s` });
  return (
    <div
      className={"card " + (t ? t.cls : "lock") + (tier === "COLLECTOR" ? "" : " nc")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) onClick(); }}
    >
      <span className="tag">{t ? t.label : "?"}</span>
      {tier === "PRIME" && <span className="sym">◆</span>}
      {tier === "ABSOLUTE" && <span className="sym">♛</span>}
      <Sprite data={card.sprite} sil={!card.owned} />
      <div className="nm">{card.owned ? card.name : "???"}</div>
      {tier === "COLLECTOR" && <div className="id">{`#${t!.label}-${no}`}</div>}
      {Array.from({ length: n }, (_, k) => {
        if (tier === "PRIME") return <i key={k} className="dm" style={pos(k)}>◆</i>;
        if (tier === "ABSOLUTE")
          return k % 3 === 0
            ? <i key={k} className="cw" style={pos(k)}>♛</i>
            : <i key={k} className="pt" style={{ ...pos(k), background: ["#ff6f00", "#ffd23f", "#ff3d00"][k % 3] }} />;
        return <i key={k} className="pt" style={{ ...pos(k), background: tier === "S_PLUS" ? ["#ff4081", "#40c4ff", "#ffd23f"][k % 3] : tier === "COLLECTOR" ? ["#fff3b0", "#ffd23f", "#ffffff"][k % 3] : "#ffe066" }} />;
      })}
    </div>
  );
}
