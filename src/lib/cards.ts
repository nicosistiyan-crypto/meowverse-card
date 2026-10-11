import "server-only";
import { db } from "./db";
import { TIER, type PublicCard } from "./types";

// Builds the collection for ONE user. The server decides what is revealed.
export async function getCollection(userId: string) {
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
  const cards: PublicCard[] = (c.data ?? []).map((x: any) => {
    const at = first.get(x.id);
    const base = { id: x.id, no: x.collection_number, sprite: x.sprite_data };
    return at
      ? { ...base, owned: true, name: x.name, tier: x.tier, description: x.description, obtainedAt: at }
      : { ...base, owned: false };
  });
  return { cards, ownedCount: cards.filter((x) => x.owned).length, total: cards.length };
}

// Public view of another player. Only explicit, non-sensitive columns are selected.
export async function getPublicProfile(username: string) {
  const { data: u } = await db.from("users").select("id, username, created_at, active").eq("username", username).maybeSingle();
  if (!u || !u.active) return null;
  const [prof, uc, tot] = await Promise.all([
    db.from("profiles").select("bio, avatar_url, border").eq("user_id", u.id).maybeSingle(),
    db.from("user_cards").select("obtained_at, cards(id, collection_number, name, tier, description, sprite_data, enabled)").eq("user_id", u.id),
    db.from("cards").select("*", { count: "exact", head: true }).eq("enabled", true),
  ]);
  const seen = new Map<number, PublicCard>();
  for (const r of uc.data ?? []) {
    const c: any = r.cards;
    if (!c || !c.enabled || seen.has(c.id)) continue;
    seen.set(c.id, { id: c.id, no: c.collection_number, sprite: c.sprite_data, owned: true, name: c.name, tier: c.tier, description: c.description, obtainedAt: r.obtained_at });
  }
  // showcase = ids chosen by the player (max 12). Read separately so the profile still works before stage9.sql has been run.
  const sc = await db.from("profiles").select("showcase").eq("user_id", u.id).maybeSingle();
  const ids: number[] = !sc.error && Array.isArray((sc.data as any)?.showcase) ? (sc.data as any).showcase : [];
  const showcase = ids.map((id) => seen.get(id)).filter((c): c is PublicCard => !!c).slice(0, 12);
  const rank = (c: PublicCard) => TIER[c.tier!].rank;
  const owned = [...seen.values()].sort((a, b) => rank(b) - rank(a) || a.no - b.no);
  return { username: u.username as string, joined: u.created_at as string, bio: (prof.data?.bio as string | null) ?? null, avatarUrl: (prof.data?.avatar_url as string | null) ?? null, border: (prof.data?.border as string | null) ?? null, owned, showcase, total: tot.count ?? 0 };
}

export async function searchPlayers(q: string) {
  let query = db.from("users").select("username, created_at, profiles(avatar_url, border)").eq("active", true).order("created_at", { ascending: false }).limit(20);
  if (q) query = query.ilike("username", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  return (data ?? []).map((u: any) => {
    const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
    return { username: u.username as string, avatarUrl: (p?.avatar_url as string | null) ?? null, border: (p?.border as string | null) ?? null };
  });
}
