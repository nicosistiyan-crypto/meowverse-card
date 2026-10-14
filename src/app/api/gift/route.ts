import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, limited } from "@/lib/auth";
import { pushMessage, syncBorders } from "@/lib/notify";

const MAX_GIFT = 50;   // kartu per kiriman
const body = z.object({
  rowIds: z.array(z.number().int().positive()).min(1).max(MAX_GIFT).optional(),
  rowId: z.number().int().positive().optional(),   // format lama (1 kartu) tetap diterima
  to: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/),
});
const err = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return err("Please log in.", 401);
  if (limited("gift:" + user.id, 20, 60_000)) return err("Terlalu cepat. Tunggu sebentar.", 429);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return err(`Pilih 1 sampai ${MAX_GIFT} kartu dan isi username penerima dengan benar.`);
  const ids = [...new Set(p.data.rowIds ?? (p.data.rowId ? [p.data.rowId] : []))];
  if (!ids.length) return err("Pilih minimal satu kartu.");
  if (p.data.to === user.username) return err("Tidak bisa mengirim kartu ke diri sendiri.");

  const { data: to } = await db.from("users").select("id, username, active").eq("username", p.data.to).maybeSingle();
  if (!to || !to.active) return err("Pemain dengan username itu tidak ditemukan.", 404);

  // Semua baris harus milik pengirim; gift_cards memeriksanya lagi di dalam transaksi (semua pindah atau tidak ada yang pindah).
  const { data: rows } = await db.from("user_cards").select("id, cards(name, tier)").in("id", ids).eq("user_id", user.id);
  if (!rows || rows.length !== ids.length) return err("Ada kartu yang tidak ada di koleksimu. Muat ulang halaman lalu pilih lagi.", 404);

  let { error } = await db.rpc("gift_cards", { p_from: user.id, p_to: to.id, p_rows: ids });
  if (error && ids.length === 1 && /gift_cards|schema cache|does not exist/i.test(error.message)) {
    // stage18.sql belum dijalankan: satu kartu masih bisa lewat fungsi lama
    ({ error } = await db.rpc("gift_card", { p_from: user.id, p_to: to.id, p_row: ids[0] }));
  }
  if (error) {
    if (/gift_cards|schema cache|does not exist/i.test(error.message)) return err("Kirim banyak kartu belum aktif di database. Admin: jalankan supabase/stage18.sql.", 500);
    if (/not owned/i.test(error.message)) return err("Ada kartu yang sudah tidak kamu miliki. Muat ulang halaman lalu pilih lagi.", 409);
    console.error("gift_cards rpc:", error);
    return err("Gagal mengirim kartu: " + error.message, 500);
  }
  const names = (rows as any[]).map((r) => (r.cards?.name as string | undefined) ?? "kartu");
  const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` dan ${names.length - 3} kartu lainnya` : "");
  await pushMessage(to.id, "gift", `🎁 ${user.username} mengirim ${names.length === 1 ? "kartu" : names.length + " kartu"} untukmu: ${shown}!`);
  await syncBorders(to.id);
  return NextResponse.json({ ok: true, to: to.username, count: names.length, name: names[0] });
}
