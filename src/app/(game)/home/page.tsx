import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCollection } from "@/lib/cards";
import { notifCounts, hasCrown } from "@/lib/notify";
import Crown from "@/components/Crown";

// Pixel icons drawn as SVG rects (crisp at any size), coloured by the button text.
const CART = ["XX..........", ".X..........", ".X.XXXXXXXXX", ".X..XXXXXXX.", ".X..XXXXXXX.", ".X...XXXXX..", ".XXXXXXXXX..", "............", "...XX...XX..", "...XX...XX.."];
const CHECK = ["....XXXX....", "..XXX..XXX..", ".XX......XX.", ".X........X.", "XX.......XXX", "X.......XX.X", "X..X...XX..X", "XX.XX.XX..XX", ".X..XXX...X.", ".XX..X...XX.", "..XXX..XXX..", "....XXXX...."];
function PixelIcon({ rows }: { rows: string[] }) {
  return (
    <svg width={rows[0].length * 2} height={rows.length * 2} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" style={{ flex: "none" }}>
      {rows.flatMap((r, y) => r.split("").map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
}

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [{ ownedCount, total }, { claimable }, crown] = await Promise.all([getCollection(user.id, true), notifCounts(user.id), hasCrown(user.id)]);
  return (
    <>
      <h2>Welcome, {user.username}!<Crown show={crown} size={3} /></h2>
      <div className="px" style={{ fontSize: 12, marginBottom: 8 }}>{ownedCount} / {total} COLLECTED</div>
      <div className="bar"><i style={{ width: `${total ? (ownedCount / total) * 100 : 0}%` }} /></div>
      <div style={{ margin: "18px 0" }}>
        <Link prefetch={false} className="abtn press" href="/pack">OPEN PACK</Link>
      </div>
      {user.role === "SUPER_ADMIN" && <p><Link prefetch={false} href="/admin">Buka admin</Link></p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Link prefetch={false} className="abtn press" href="/shop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><PixelIcon rows={CART} />SHOP</Link>
        <Link prefetch={false} className="abtn press" href="/claim" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><PixelIcon rows={CHECK} />CLAIM{claimable > 0 && <span className="dotn gold" aria-label={`${claimable} baru`}>{claimable > 9 ? "9+" : claimable}</span>}</Link>
      </div>
    </>
  );
}
