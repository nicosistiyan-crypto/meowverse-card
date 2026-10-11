import type { CSSProperties } from "react";
import { BORDERS, isBorder } from "@/lib/types";

// Avatar = an uploaded image, or a plain initial if nothing was uploaded yet. `border` adds a claimed profile border.
// Tiap tier punya bentuk & animasi sendiri (lihat "profile borders" di globals.css):
//   PURPLE = kristal berfaset · RED = bingkai api bergerigi · GOLD = bingkai kerajaan bermahkota
export default function Avatar({ url, name, size = 72, border }: { url?: string | null; name: string; size?: number; border?: string | null }) {
  const box = { width: size, height: size, border: "3px solid var(--line)", background: "var(--panel)", flexShrink: 0 } as const;
  const inner = url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={name} style={{ ...box, objectFit: "cover", display: "block" }} />
    : <div style={{ ...box, display: "grid", placeItems: "center", fontFamily: "'Press Start 2P',monospace", fontSize: size / 3, lineHeight: 1 }}>{name[0]?.toUpperCase()}</div>;
  if (!isBorder(border)) return inner;
  const p = Math.max(5, Math.round(size * 0.11)); // lebar bingkai ikut ukuran avatar
  return (
    <span className={"avw bd " + BORDERS[border].cls} style={{ "--p": p + "px" } as CSSProperties}>
      <span className="bdg" aria-hidden />
      <span className="bdl" aria-hidden><span className="bdr" /></span>
      {inner}
      <span className="bo bo1" aria-hidden /><span className="bo bo2" aria-hidden /><span className="bo bo3" aria-hidden /><span className="bo bo4" aria-hidden />
      {border === "GOLD" && <><span className="bj bj1" aria-hidden /><span className="bj bj2" aria-hidden /><span className="bj bj3" aria-hidden /></>}
    </span>
  );
}
