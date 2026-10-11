import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { notifCounts } from "@/lib/notify";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  return NextResponse.json(await notifCounts(user.id));
}
