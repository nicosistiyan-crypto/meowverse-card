import "server-only";
import { db } from "./db";
import { BORDERS, REWARDS, isBorder, isReward, type Conv, type ChatMsg, type ChatPeer } from "./types";

export async function pushMessage(userId: string, kind: string, body: string) {
  const { error } = await db.from("notifications").insert({ user_id: userId, kind, body: body.slice(0, 300) });
  if (error) console.error("pushMessage:", error.message);
}

/** Unlocks any border the player now qualifies for and tells them about it. Returns the newly unlocked keys. */
export async function syncBorders(userId: string): Promise<string[]> {
  // borders dan hadiah coin / mahkota (stage17.sql) dicek BERSAMAAN: dulu beruntun, jadi buka pack menunggu dua perjalanan ke database
  const [{ data, error }] = await Promise.all([db.rpc("sync_borders", { p_user: userId }), syncRewards(userId)]);
  if (error) { console.error("sync_borders:", error.message); return []; }
  const fresh = ((data ?? []) as string[]).filter(isBorder);
  for (const b of fresh) await pushMessage(userId, "border", `🎁 ${BORDERS[b].label} terbuka! Buka menu CLAIM untuk mengklaimnya.`);
  return fresh;
}

/** Unlocks the coin / crown rewards the player now qualifies for (stage17.sql) and tells them. Returns the newly unlocked keys. */
export async function syncRewards(userId: string): Promise<string[]> {
  const { data, error } = await db.rpc("sync_rewards", { p_user: userId });
  if (error) { console.error("sync_rewards:", error.message); return []; }   // stage17.sql belum dijalankan: abaikan
  const fresh = ((data ?? []) as string[]).filter(isReward);
  for (const r of fresh) await pushMessage(userId, "reward", `${REWARDS[r].label} terbuka! Buka menu CLAIM untuk mengklaimnya.`);
  return fresh;
}

/** Whether this player claimed the crown. One query when the user id is already known (crownedNames needs two). */
export async function hasCrown(userId: string): Promise<boolean> {
  const { data, error } = await db.from("user_rewards").select("user_id").eq("user_id", userId).eq("reward", "CROWN").not("claimed_at", "is", null).maybeSingle();
  return !error && !!data;
}

/** Of these usernames, the ones that claimed the crown (150 cards). */
export async function crownedNames(names: string[]): Promise<Set<string>> {
  if (!names.length) return new Set();
  const { data: us } = await db.from("users").select("id, username").in("username", names);
  const ids = (us ?? []).map((u: any) => u.id as string);
  if (!ids.length) return new Set();
  const { data, error } = await db.from("user_rewards").select("user_id").eq("reward", "CROWN").not("claimed_at", "is", null).in("user_id", ids);
  if (error) return new Set();
  const ok = new Set((data ?? []).map((r: any) => r.user_id as string));
  return new Set((us ?? []).filter((u: any) => ok.has(u.id)).map((u: any) => u.username as string));
}

export async function notifCounts(userId: string): Promise<{ unread: number; claimable: number }> {
  const [m, b, r] = await Promise.all([
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    db.from("user_borders").select("border", { count: "exact", head: true }).eq("user_id", userId).is("claimed_at", null),
    db.from("user_rewards").select("reward", { count: "exact", head: true }).eq("user_id", userId).is("claimed_at", null),
  ]);
  return { unread: m.count ?? 0, claimable: (b.count ?? 0) + (r.error ? 0 : r.count ?? 0) };
}

/** One row per conversation: every player who wrote to you or got a message from you, plus the system notifications. Newest first. */
export async function loadConvs(userId: string): Promise<Conv[]> {
  const [a, b] = await Promise.all([
    db.from("notifications").select("id, kind, body, created_at, read_at, from_user").eq("user_id", userId).order("created_at", { ascending: false }).limit(300),
    db.from("notifications").select("body, created_at, user_id").eq("from_user", userId).eq("kind", "dm").order("created_at", { ascending: false }).limit(300),
  ]);
  // Before stage8.sql is run the from_user column does not exist yet: keep showing the plain notifications instead of an empty list.
  let inRows: any[] = a.data ?? [];
  if (a.error) {
    const r = await db.from("notifications").select("id, kind, body, created_at, read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(300);
    inRows = r.data ?? [];
  }
  const outRows: any[] = b.data ?? [];
  const map = new Map<string, { last: string; at: string; unread: number; mine: boolean }>();
  const put = (key: string, body: string, at: string, unread: number, mine: boolean) => {
    const c = map.get(key);
    if (!c) { map.set(key, { last: body, at, unread, mine }); return; }
    c.unread += unread;
    if (Date.parse(at) > Date.parse(c.at)) { c.last = body; c.at = at; c.mine = mine; }
  };
  for (const r of inRows) put(r.from_user ?? "_sys", r.body, r.created_at, r.read_at ? 0 : 1, false);
  for (const r of outRows) put(r.user_id, r.body, r.created_at, 0, true);
  const ids = Array.from(map.keys()).filter((k) => k !== "_sys");
  const names = new Map<string, string>();
  const looks = new Map<string, ChatPeer>();
  if (ids.length) {
    const [us, ps] = await Promise.all([
      db.from("users").select("id, username").in("id", ids),
      db.from("profiles").select("user_id, avatar_url, border").in("user_id", ids),
    ]);
    (us.data ?? []).forEach((u: any) => names.set(u.id, u.username));
    (ps.data ?? []).forEach((p: any) => looks.set(p.user_id, { avatarUrl: p.avatar_url ?? null, border: p.border ?? null }));
  }
  return Array.from(map.entries())
    .map(([k, c]) => ({ who: k === "_sys" ? null : names.get(k) ?? "???", ...c, ...(k === "_sys" ? {} : looks.get(k) ?? {}) }))
    .sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
}

/** The messages between you and one player (oldest first), or the system notifications for who = "_sys". null = no such player. */
export async function loadThread(userId: string, who: string): Promise<{ msgs: ChatMsg[]; peerId: string | null; peer: ChatPeer | null } | null> {
  if (who === "_sys") {
    let r: any = await db.from("notifications").select("id, body, created_at").eq("user_id", userId).is("from_user", null).order("created_at", { ascending: false }).limit(100);
    if (r.error) r = await db.from("notifications").select("id, body, created_at").eq("user_id", userId).neq("kind", "dm").order("created_at", { ascending: false }).limit(100);
    const rows: any[] = (r.data ?? []).slice().reverse();
    return { msgs: rows.map((m) => ({ id: m.id, mine: false, body: m.body, at: m.created_at, read: true })), peerId: null, peer: null };
  }
  const { data: u } = await db.from("users").select("id, active").eq("username", who).maybeSingle();
  if (!u || !u.active) return null;
  const { data } = await db.from("notifications").select("id, body, created_at, read_at, user_id")
    .eq("kind", "dm")
    .or(`and(user_id.eq.${userId},from_user.eq.${u.id}),and(user_id.eq.${u.id},from_user.eq.${userId})`)
    .order("created_at", { ascending: false }).limit(200);
  const rows: any[] = (data ?? []).slice().reverse();
  const { data: pr } = await db.from("profiles").select("avatar_url, border").eq("user_id", u.id).maybeSingle();
  const peer: ChatPeer = { avatarUrl: (pr?.avatar_url as string | null) ?? null, border: (pr?.border as string | null) ?? null };
  return { msgs: rows.map((m) => ({ id: m.id, mine: m.user_id !== userId, body: m.body, at: m.created_at, read: !!m.read_at })), peerId: u.id, peer };
}
