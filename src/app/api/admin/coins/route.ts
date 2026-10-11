import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { pushMessage } from "@/lib/notify";

const body = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/).optional(), // omitted = the admin's own account
  amount: z.number().int().min(1).max(1_000_000_000),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Username atau jumlah coin tidak valid (1 - 1.000.000.000)." }, { status: 400 });
  let target = { id: user.id, username: user.username };
  if (p.data.username && p.data.username !== user.username) {
    const { data } = await db.from("users").select("id, username").eq("username", p.data.username).eq("active", true).maybeSingle();
    if (!data) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    target = data as { id: string; username: string };
  }
  const { data: balance, error } = await db.rpc("grant_coins", { p_user: target.id, p_amount: p.data.amount });
  if (error || balance == null) return NextResponse.json({ error: "Gagal menambah coin. Pastikan supabase/stage10.sql sudah dijalankan." }, { status: 500 });
  if (target.id !== user.id) await pushMessage(target.id, "coin", `🪙 Kamu menerima ${p.data.amount.toLocaleString("id-ID")} coin dari admin.`);
  return NextResponse.json({ ok: true, username: target.username, balance: Number(balance) });
}
