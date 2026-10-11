import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/cards";
import ShowcaseSlab from "@/components/ShowcaseSlab";
import Avatar from "@/components/Avatar";

export default async function PlayerProfile({ params }: { params: { username: string } }) {
  const me = await getUser();
  if (!me) redirect("/login");
  const name = params.username.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) notFound();
  const p = await getPublicProfile(name);
  if (!p) notFound();
  const mine = p.username === me.username;
  return (
    <>
      <div className="prof">
        <Avatar url={p.avatarUrl} name={p.username} border={p.border} />
        <div>
          <h2 style={{ margin: 0 }}>{p.username}{mine ? " (kamu)" : ""}</h2>
          <div style={{ color: "var(--mute)" }}>{p.bio ?? "Kolektor kucing"}</div>
          {mine ? <div className="plinks"><Link prefetch={false} href="/profile">Edit profil</Link><Link prefetch={false} href="/profile#pameran">Atur pameran</Link></div> : <Link prefetch={false} href={`/gift?to=${p.username}`}>Kirim kartu</Link>}
        </div>
      </div>
      <h2>Koleksi {p.owned.length} / {p.total}</h2>
      <h2>PAMERAN ({p.showcase.length} / 12)</h2>
      {p.showcase.length ? <div className="grid">{p.showcase.map((c) => <ShowcaseSlab key={c.id} card={c} total={p.total} />)}</div>
        : <div className="empty">{mine ? "Belum ada kartu yang dipajang. Pilih lewat Atur pameran." : "Pemain ini belum memajang kartu."}</div>}
    </>
  );
}
