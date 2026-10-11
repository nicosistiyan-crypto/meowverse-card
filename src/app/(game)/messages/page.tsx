import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Messages() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("messages").select("id, body, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const list = data ?? [];
  const ids = list.filter((m) => !m.read_at).map((m) => m.id);
  // Show them as unread this one time, then mark them read.
  if (ids.length) await db.from("messages").update({ read_at: new Date().toISOString() }).in("id", ids);
  return (
    <>
      <h2>PESAN</h2>
      {list.length === 0 ? <div className="empty">Belum ada pesan. Kartu hadiah dan border baru akan muncul di sini.</div> : (
        <div className="msgs">
          {list.map((m) => (
            <div key={m.id} className={"msg" + (m.read_at ? "" : " unread")}>
              {m.body}
              <time>{new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
