import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";

const MAX = 2 * 1024 * 1024;
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Type is decided from the file's real bytes, never from the filename or the browser's claim.
function detect(b: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("avatar:" + user.id, 10, 10 * 60_000)) return err("Terlalu sering. Coba lagi nanti.", 429);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return err("Pilih file gambar.");
  if (file.size > MAX) return err("Ukuran maksimal 2 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = detect(buf);
  if (!type) return err("Hanya PNG, JPG, atau WEBP.");

  // Make sure the bucket exists (the SQL step that creates it is easy to miss).
  const { error: bErr } = await db.storage.createBucket("avatars", { public: true, fileSizeLimit: MAX, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] });
  if (bErr && !/already exists|duplicate/i.test(bErr.message)) console.error("avatar bucket:", bErr);

  const { error } = await db.storage.from("avatars").upload(user.id, buf, { contentType: type, upsert: true, cacheControl: "60" });
  if (error) { console.error("avatar upload:", error); return err("Upload gagal: " + error.message, 500); }
  // The image is served by our own route (/api/avatar/<id>), so it shows even if the bucket is private.
  const url = `/api/avatar/${user.id}?v=${Date.now()}`;
  const { error: pErr } = await db.from("profiles").upsert({ user_id: user.id, avatar_url: url, updated_at: new Date().toISOString() });
  if (pErr) { console.error("avatar profile:", pErr); return err("Foto terupload tapi gagal disimpan ke profil: " + pErr.message, 500); }
  return NextResponse.json({ url });
}
