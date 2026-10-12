import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { readWallet } from "@/lib/balance";

export const dynamic = "force-dynamic";
// Current player's coin balance (polled by the coin badge in the top-right corner).
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  // coin + voucher dalam satu query; sebelum stage11.sql voucher = 0 dan coin tetap jalan (lihat lib/balance.ts)
  const { coins, blue, gold } = await readWallet(user.id);
  return NextResponse.json({ coins, blue, gold }, { headers: { "Cache-Control": "no-store" } });
}
