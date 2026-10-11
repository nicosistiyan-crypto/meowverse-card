import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { TIER_KEYS } from "@/lib/types";

const body = z.object({
  packId: z.number().int().positive(),
  odds: z.record(z.enum(TIER_KEYS as [string, ...string[]]), z.number().min(0).max(100)),
});

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const odds: Record<string, number> = {};
  for (const t of TIER_KEYS) odds[t] = p.data.odds[t] ?? 0;
  const sum = Object.values(odds).reduce((s, v) => s + v, 0);
  if (Math.abs(sum - 100) > 0.001) return NextResponse.json({ error: `Total harus 100%. Sekarang ${sum.toFixed(3)}%.` }, { status: 400 });
  const { data, error } = await db.from("packs").update({ odds }).eq("id", p.data.packId).select("id, odds");
  if (error) { console.error("save odds:", error); return NextResponse.json({ error: "Gagal menyimpan: " + error.message }, { status: 500 }); }
  if (!data?.length) return NextResponse.json({ error: "Pack tidak ditemukan." }, { status: 404 });
  revalidatePath("/pack"); revalidatePath("/admin");
  return NextResponse.json({ ok: true, odds: data[0].odds });
}
