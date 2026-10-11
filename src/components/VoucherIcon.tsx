import type { VoucherKind } from "@/lib/types";

// A pixel-art voucher ticket with a cat head on it: blue or gold. Drawn as rects, so it stays crisp at any size.
const ROWS = [
  "..OOOOOOOOOOOO..",
  ".OHHHHHHHHHHHHO.",
  "OHBBWBBBBBBWBBBO",
  "OBBBWWBBBBWWBBBO",
  ".OBBWWWWWWWWBBO.",
  ".OBBWEWWWWEWBBO.",
  "OBBBWWWNNWWWBBBO",
  "OBBBWWWWWWWWBBBO",
  "OBBBBWWWWWWBBBBO",
  ".OBBBBBBBBBBBBO.",
  "..OOOOOOOOOOOO..",
];
const PAL: Record<VoucherKind, Record<string, string>> = {
  blue: { O: "#0d3a6b", H: "#9bdcff", B: "#2f8fe8", W: "#ffffff", E: "#1b1b1b", N: "#ff8fa3" },
  gold: { O: "#6a4400", H: "#fff3b0", B: "#f5b800", W: "#fffbe8", E: "#1b1b1b", N: "#ff8fa3" },
};
export default function VoucherIcon({ kind, size = 28 }: { kind: VoucherKind; size?: number }) {
  const c = PAL[kind];
  return (
    <svg width={Math.round(size * 1.45)} height={Math.round(size)} viewBox="0 0 16 11" shapeRendering="crispEdges" aria-hidden="true" style={{ flex: "none", display: "block" }}>
      {ROWS.flatMap((r, y) => r.split("").map((ch, x) => (c[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c[ch]} /> : null)))}
    </svg>
  );
}
