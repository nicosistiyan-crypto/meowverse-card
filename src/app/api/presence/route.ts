import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";

// Ping dari browser pemain yang sedang membuka web: mencatat "terakhir terlihat" supaya muncul bulatan hijau (online).
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (limited("presence:" + user.id, 12, 60_000)) return NextResponse.json({ ok: true });
  const { error } = await db.from("users").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  if (error) console.error("presence:", error.message);   // kolom last_seen baru ada setelah stage16.sql dijalankan
  return NextResponse.json({ ok: !error });
}
