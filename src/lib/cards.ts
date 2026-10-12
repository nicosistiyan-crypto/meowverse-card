import "server-only";
import { db } from "./db";
import type { PublicCard } from "./types";
import { crownedNames, hasCrown } from "./notify";
import { timed } from "./perf";

// Pemain dianggap online jika ping terakhirnya (lihat /api/presence) kurang dari 2 menit lalu.
const ONLINE_MS = 2 * 60 * 1000;
const isOnline = (iso: unknown) => typeof iso === "string" && Date.now() - Date.parse(iso) < ONLINE_MS;

// Builds the collection for ONE user. The server decides what is revealed.
// keepDiscovered: kartu yang pernah didapat tetap terhitung (tidak jadi "?") walau sudah dijual / difusi (tabel user_discovered, stage16.sql).
export async function getCollection(userId: string, keepDiscovered = false) {
  const [c, u] = await Promise.all([
    db.from("cards").select("id, collection_number, name, tier, description, sprite_data").eq("enabled", true).order("collection_number"),
    db.from("user_cards").select("card_id, obtained_at").eq("user_id", userId),
  ]);
  if (c.error || u.error) throw new Error("Failed to load collection");
  const first = new Map<number, string>();
  for (const r of u.data ?? []) {
    const p = first.get(r.card_id);
    if (!p || r.obtained_at < p) first.set(r.card_id, r.obtained_at);
  }
  if (keepDiscovered) {
    // sebelum stage16.sql dijalankan tabelnya belum ada: errornya diabaikan, koleksi tampil seperti biasa
    const d = await db.from("user_discovered").select("card_id, discovered_at").eq("user_id", userId);
    if (!d.error) for (const r of d.data ?? []) {
      const p = first.get(r.card_id);
      if (!p || r.discovered_at < p) first.set(r.card_id, r.discovered_at);
    }
  }
  const cards: PublicCard[] = (c.data ?? []).map((x: any) => {
    const at = first.get(x.id);
    const base = { id: x.id, no: x.collection_number, sprite: x.sprite_data };
    return at
      ? { ...base, owned: true, name: x.name, tier: x.tier, description: x.description, obtainedAt: at }
      : { ...base, owned: false };
  });
  return { cards, ownedCount: cards.filter((x) => x.owned).length, total: cards.length };
}

// Profil + pameran dalam satu query. Kolom `showcase` baru ada setelah stage9.sql: kalau belum ada, profil tetap tampil tanpa pameran.
async function profileRow(userId: string): Promise<{ data: any; showcase: number[] | null }> {
  const r = await db.from("profiles").select("bio, avatar_url, border, showcase").eq("user_id", userId).maybeSingle();
  if (!r.error) return { data: r.data, showcase: Array.isArray((r.data as any)?.showcase) ? (r.data as any).showcase : null };
  const f = await db.from("profiles").select("bio, avatar_url, border").eq("user_id", userId).maybeSingle();
  return { data: f.data, showcase: null };
}

// Public view of another player. Only explicit, non-sensitive columns are selected.
// Dulu: 7 langkah beruntun dan SEMUA kartu pemain (dengan sprite) ditarik, padahal yang tampil hanya <= 12 kartu pameran + jumlah koleksi.
// Sekarang: pemain -> (profil, daftar id kartu, total, last_seen, mahkota) bersamaan -> hanya kartu pameran. Informasi yang tampil sama.
export async function getPublicProfile(username: string) {
  const { data: u } = await timed("profile.user", () => db.from("users").select("id, username, created_at, active").eq("username", username).maybeSingle());
  if (!u || !u.active) return null;
  const first = timed("profile.parallel", () => Promise.all([
    profileRow(u.id),
    // hanya id + waktu + status enabled (tanpa sprite / nama / deskripsi): cukup untuk menghitung koleksi & memeriksa kepemilikan pameran
    db.from("user_cards").select("card_id, obtained_at, cards(enabled)").eq("user_id", u.id),
    db.from("cards").select("*", { count: "exact", head: true }).eq("enabled", true),
    db.from("users").select("last_seen").eq("id", u.id).maybeSingle(),   // terpisah: kolomnya baru ada setelah stage16.sql
    hasCrown(u.id),
  ]));
  const [prof, uc, tot, ls, crown] = await first;
  const pd = (prof.data ?? null) as any;
  // kartu unik yang dimiliki dan masih aktif (duplikat dihitung sekali), dengan waktu dapat paling awal
  const at = new Map<number, string>();
  for (const r of (uc.data ?? []) as any[]) {
    if (!r.cards || !r.cards.enabled) continue;
    const p = at.get(r.card_id);
    if (!p || r.obtained_at < p) at.set(r.card_id, r.obtained_at);
  }
  const ids = (Array.isArray(prof.showcase) ? prof.showcase : []).filter((id) => at.has(id));
  let showcase: PublicCard[] = [];
  if (ids.length) {
    const { data: cs } = await timed("profile.showcase", () => db.from("cards").select("id, collection_number, name, tier, description, sprite_data, enabled").in("id", ids));
    const byId = new Map<number, any>((cs ?? []).map((c: any) => [c.id, c]));
    showcase = ids
      .map((id) => byId.get(id))
      .filter((c): c is any => !!c && c.enabled)
      .slice(0, 12)
      .map((c: any) => ({ id: c.id, no: c.collection_number, sprite: c.sprite_data, owned: true, name: c.name, tier: c.tier, description: c.description, obtainedAt: at.get(c.id) }));
  }
  const online = !ls.error && isOnline((ls.data as any)?.last_seen);
  return { username: u.username as string, joined: u.created_at as string, bio: (pd?.bio as string | null) ?? null, avatarUrl: (pd?.avatar_url as string | null) ?? null, border: (pd?.border as string | null) ?? null, ownedCount: at.size, showcase, total: tot.count ?? 0, online, crown };
}

export async function searchPlayers(q: string) {
  let query = db.from("users").select("username, created_at, profiles(avatar_url, border)").eq("active", true).order("created_at", { ascending: false }).limit(20);
  if (q) query = query.ilike("username", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  const names = (data ?? []).map((u: any) => u.username as string);
  const seen = new Map<string, unknown>();
  if (names.length) {
    const ls = await db.from("users").select("username, last_seen").in("username", names);   // terpisah: kolomnya baru ada setelah stage16.sql
    if (!ls.error) for (const r of ls.data ?? []) seen.set((r as any).username, (r as any).last_seen);
  }
  const crowned = await crownedNames(names);
  return (data ?? []).map((u: any) => {
    const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
    return { crown: crowned.has(u.username as string), username: u.username as string, avatarUrl: (p?.avatar_url as string | null) ?? null, border: (p?.border as string | null) ?? null, online: isOnline(seen.get(u.username)) };
  });
}
