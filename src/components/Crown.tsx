// Mahkota kecil di kanan username: hadiah untuk pemain yang mengoleksi 150 kartu (menu CLAIM).
const ROWS = ["X...XX...X", "XX..XX..XX", "XXX.XX.XXX", "XXXXXXXXXX", "XXXXXXXXXX", ".XXXXXXXX."];
export default function Crown({ show, size = 2 }: { show?: boolean; size?: number }) {
  if (!show) return null;
  return (
    <span className="crown" title="Kolektor 150 kartu" aria-label="Kolektor 150 kartu">
      <svg width={ROWS[0].length * size} height={ROWS.length * size} viewBox={`0 0 ${ROWS[0].length} ${ROWS.length}`} shapeRendering="crispEdges" aria-hidden="true">
        {ROWS.flatMap((r, y) => r.split("").map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={y >= 4 ? "#ff9d00" : "#ffd24a"} /> : null)))}
        <rect x="1" y="0" width="1" height="1" fill="#ff4d6d" /><rect x="4.5" y="0" width="1" height="1" fill="#4fc3f7" /><rect x="8" y="0" width="1" height="1" fill="#ff4d6d" />
      </svg>
    </span>
  );
}
