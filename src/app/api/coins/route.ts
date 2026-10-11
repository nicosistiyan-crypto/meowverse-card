import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Current player's coin balance (polled by the coin badge in the top-right corner).
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { data } = await db.from("users").select("coins").eq("id", user.id).maybeSingle();
  // vouchers are read separately so the coin badge keeps working even before supabase/stage11.sql has been run
  const v = await db.from("users").select("blue_vouchers, gold_vouchers").eq("id", user.id).maybeSingle();
  const blue = Number((v.data as any)?.blue_vouchers ?? 0), gold = Number((v.data as any)?.gold_vouchers ?? 0);
  return NextResponse.json({ coins: Number((data as any)?.coins ?? 0), blue, gold }, { headers: { "Cache-Control": "no-store" } });
}
