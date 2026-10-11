import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { loadConvs, loadThread } from "@/lib/notify";

export const dynamic = "force-dynamic";
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** GET -> the conversation list. GET ?with=username (or _sys) -> that thread; opening it marks what they wrote to you as read. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  const w = (new URL(req.url).searchParams.get("with") ?? "").trim().toLowerCase();
  if (!w) return NextResponse.json({ convs: await loadConvs(user.id) });
  if (w !== "_sys" && !/^[a-z0-9_]{3,20}$/.test(w)) return err("Username tidak valid.");
  const t = await loadThread(user.id, w);
  if (!t) return err("Pemain dengan username itu tidak ditemukan.", 404);
  const q = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (w === "_sys") await q.is("from_user", null); else if (t.peerId) await q.eq("from_user", t.peerId);
  return NextResponse.json({ msgs: t.msgs, peer: t.peer });
}

const body = z.object({
  to: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/),
  text: z.string().trim().min(1).max(300),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("dm:" + user.id, 30, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Isi username penerima dan pesan (maksimal 300 karakter).");
  if (p.data.to === user.username) return err("Tidak bisa mengirim pesan ke diri sendiri.");
  const { data: to } = await db.from("users").select("id, username, active").eq("username", p.data.to).maybeSingle();
  if (!to || !to.active) return err("Pemain dengan username itu tidak ditemukan.", 404);
  const { data, error } = await db.from("notifications").insert({ user_id: to.id, kind: "dm", from_user: user.id, body: p.data.text }).select("id").single();
  if (error) { console.error("send dm:", error.message); return err("Gagal mengirim pesan.", 500); }
  return NextResponse.json({ ok: true, to: to.username, id: data?.id });
}
