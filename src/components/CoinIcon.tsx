// Round gold coin with a cat face, drawn as pixel rects (crisp at any size).
const ROWS = [".....OOOO.....", "...OOOGGOOO...", "..OHHGGGGGOO..", ".OHHCGGGGCGOO.", ".OHGCCGGCCGGO.", "OOGGCCCCCCGGOO", "OGGGCECCECGGGO", "OGGGCCCCCCGGGO", "OOGGCCNNCCGGOO", ".OGGGCCCCGGGO.", ".OOGGGGGGGGOO.", "..OOGGGGGGOO..", "...OOOGGOOO...", ".....OOOO....."];
const COL: Record<string, string> = { O: "#8a5a00", G: "#ffd23f", H: "#fff3b0", C: "#a86a00", E: "#fff3b0", N: "#ff6f8e" };
export default function CoinIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true" style={{ flex: "none", display: "block" }}>
      {ROWS.flatMap((r, y) => r.split("").map((c, x) => (COL[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COL[c]} /> : null)))}
    </svg>
  );
}
