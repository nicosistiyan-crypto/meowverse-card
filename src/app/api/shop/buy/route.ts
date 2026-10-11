import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { getVoucherPrices } from "@/lib/settings";

const body = z.object({ kind: z.enum(["blue", "gold"]), qty: z.number().int().min(1).max(99) });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("shop:" + user.id, 30, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err("Permintaan tidak valid.", 400);
  // The price is read here on the server (the admin's current setting); the browser never sends a price.
  const prices = await getVoucherPrices();
  const total = Math.round(Number(prices[p.data.kind])) * p.data.qty;
  if (!Number.isFinite(total) || total < 0) return err("Harga voucher belum diatur.", 500);
  const { data: w } = await db.from("users").select("coins").eq("id", user.id).maybeSingle();
  if (Number((w as any)?.coins ?? 0) < total) return err(`Coin kamu kurang. Total ${total.toLocaleString("id-ID")} coin.`, 402);
  const { data, error } = await db.rpc("buy_voucher", { p_user: user.id, p_kind: p.data.kind, p_qty: p.data.qty, p_total: total });
  if (error || !data) {
    console.error("buy_voucher:", error);
    return err(/insufficient/i.test(error?.message ?? "") ? "Coin kamu kurang." : "Pembelian gagal. Pastikan supabase/stage11.sql sudah dijalankan.", /insufficient/i.test(error?.message ?? "") ? 402 : 500);
  }
  return NextResponse.json({ ok: true, ...(data as { coins: number; blue: number; gold: number }) });
}
