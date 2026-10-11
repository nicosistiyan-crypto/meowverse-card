import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const n = z.number().min(0).max(100);
const body = z.object({ C: n, B: n, A: n, S: n, S_PLUS: n });

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Setiap angka harus 0 sampai 100." }, { status: 400 });
  const { error } = await db.from("settings").upsert({ key: "fusion_upgrade", value: p.data });
  if (error) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  revalidatePath("/fusion"); revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
