import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { searchPlayers } from "@/lib/cards";
import Avatar from "@/components/Avatar";
import AdminBadge from "@/components/AdminBadge";
import Crown from "@/components/Crown";
import OnlineAvatar from "@/components/OnlineAvatar";

export default async function Players({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const raw = (searchParams.q ?? "").trim().toLowerCase();
  const q = /^[a-z0-9_]{0,20}$/.test(raw) ? raw : "";
  const players = await searchPlayers(q);
  return (
    <>
      <h2>CARI PEMAIN</h2>
      <form method="get" className="row">
        <input name="q" defaultValue={q} placeholder="username" maxLength={20} />
        <button>CARI</button>
      </form>
      {players.length === 0 ? <div className="empty">Tidak ada pemain dengan username itu.</div> : (
        <div className="plist">
          {players.map((p) => (
            <Link prefetch={false} key={p.username} href={`/u/${p.username}`}><OnlineAvatar online={p.online}><Avatar url={p.avatarUrl} name={p.username} size={40} border={p.border} /></OnlineAvatar>{p.username}<Crown show={p.crown} /><AdminBadge name={p.username} /></Link>
          ))}
        </div>
      )}
    </>
  );
}
