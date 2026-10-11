import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const price = z.number().int().min(0).max(1_000_000_000);
const body = z.object({
  voucher: z.object({ blue: price, gold: price }),
  packs: z.array(z.object({ id: z.number().int().positive(), cardCount: z.number().int().min(1).max(20), pay: z.enum(["free", "coin", "blue", "gold"]), price })).max(50),
});

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Data tidak valid (kartu per pack 1-20, harga 0 atau lebih)." }, { status: 400 });

  const { error: e1 } = await db.from("settings").upsert({ key: "voucher_prices", value: p.data.voucher });
  if (e1) { console.error("save voucher prices:", e1); return NextResponse.json({ error: "Gagal menyimpan harga voucher: " + e1.message }, { status: 500 }); }
  for (const k of p.data.packs) {
    // free: no price | coin: coin_price | blue / gold: voucher_kind + voucher_cost (and no coin price)
    const row = k.pay === "blue" || k.pay === "gold"
      ? { card_count: k.cardCount, voucher_kind: k.pay, voucher_cost: Math.max(1, k.price), coin_price: 0 }
      : { card_count: k.cardCount, voucher_kind: null, voucher_cost: 1, coin_price: k.pay === "coin" ? k.price : 0 };
    const { error } = await db.from("packs").update(row).eq("id", k.id);
    if (error) {
      console.error("save pack:", error);
      return NextResponse.json({ error: "Gagal menyimpan pack. Pastikan supabase/stage11.sql dan stage12.sql sudah dijalankan. (" + error.message + ")" }, { status: 500 });
    }
  }
  revalidatePath("/pack"); revalidatePath("/shop"); revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
