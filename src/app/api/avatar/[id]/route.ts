import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

// Streams a player's avatar from Supabase Storage using the server key. Logged-in users only.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const { data, error } = await db.storage.from("avatars").download(params.id);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(await data.arrayBuffer(), {
    headers: { "Content-Type": data.type || "image/png", "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" },
  });
}
