import Card from "./Card";
import { TIER, type PublicCard } from "@/lib/types";

// A displayed card sits inside an exclusive clear plastic case (glossy, with a label strip and a slow light sweep). Works for every tier.
export default function ShowcaseSlab({ card, total }: { card: PublicCard; total: number }) {
  return (
    <div className="slab">
      <div className="st">{card.tier ? TIER[card.tier].name.toUpperCase() : "MEOWVERSE"} · MEOWVERSE</div>
      <Card card={card} total={total} />
    </div>
  );
}
