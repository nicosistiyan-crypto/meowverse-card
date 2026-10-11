import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const body = z.object({ PRIME: z.number().min(0).max(100), ABSOLUTE: z.number().min(0).max(100) });

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success || p.data.PRIME + p.data.ABSOLUTE > 100) return NextResponse.json({ error: "Angka tidak valid (total maksimal 100)." }, { status: 400 });
  const { error } = await db.from("settings").upsert({ key: "fusion_bonus", value: p.data });
  if (error) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  revalidatePath("/fusion"); revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
