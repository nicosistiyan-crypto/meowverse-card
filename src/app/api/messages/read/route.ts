import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  await db.from("messages").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  return NextResponse.json({ ok: true });
}
