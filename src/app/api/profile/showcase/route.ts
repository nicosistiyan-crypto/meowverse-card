import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const SHOWCASE_MAX = 12;
const body = z.object({ ids: z.array(z.number().int().positive()).max(SHOWCASE_MAX) });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: `Maksimal ${SHOWCASE_MAX} kartu yang dapat dipajang.` }, { status: 400 });
  const ids = [...new Set(p.data.ids)];
  if (ids.length) {
    const { data, error } = await db.from("user_cards").select("card_id").eq("user_id", user.id).in("card_id", ids);
    if (error) return NextResponse.json({ error: "Gagal memeriksa kartu." }, { status: 500 });
    if (new Set((data ?? []).map((r) => r.card_id)).size !== ids.length) return NextResponse.json({ error: "Hanya kartu milikmu yang dapat dipajang." }, { status: 400 });
  }
  const { error } = await db.from("profiles").upsert({ user_id: user.id, showcase: ids, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Gagal menyimpan pameran. Pastikan supabase/stage9.sql sudah dijalankan." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
