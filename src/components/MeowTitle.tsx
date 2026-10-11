// Judul "MEOWVERSE CARD" dengan warna per-huruf, outline hitam dan bayangan bawah yang sama dengan tulisan di kemasan pack (lib/packArt.ts).
const TOP = ["#ff4d6d", "#ff9f1c", "#ffe14a", "#4ccf5a", "#3bc9ff", "#7a6bff", "#d65bff", "#ff6bb5", "#ff4d6d"];
const BOT = ["#ffe14a", "#4ccf5a", "#3bc9ff", "#ff6bb5"];
const OUT = "-2px 0 #000,2px 0 #000,0 -2px #000,0 2px #000,-2px -2px #000,2px -2px #000,-2px 2px #000,2px 2px #000,0 4px #000";

export default function MeowTitle({ size }: { size?: number }) {
  const word = (w: string, cols: string[]) => w.split("").map((ch, i) => <span key={i} aria-hidden="true" style={{ color: cols[i % cols.length], textShadow: OUT }}>{ch}</span>);
  return (
    <span aria-label="MEOWVERSE CARD" style={{ fontSize: size, letterSpacing: 1, display: "inline-block", paddingBottom: 4 }}>
      {word("MEOWVERSE", TOP)}<span aria-hidden="true"> </span>{word("CARD", BOT)}
    </span>
  );
}
