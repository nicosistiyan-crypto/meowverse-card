export type TierKey = "C" | "B" | "A" | "S" | "S_PLUS" | "PRIME" | "ABSOLUTE" | "COLLECTOR";
// `anim` makes a normal sprite blink and nod its head (ABSOLUTE cards).
// `scene` marks an animated scene card (COLLECTOR): the canvas is drawn by lib/scenes.ts instead of the 16x16 sprite.
export type SpriteData = { pal: Record<string, string>; ov: [number, number, string][]; scene?: string; anim?: boolean };
// Unowned cards carry only id, number and sprite shape (for the silhouette). Name, tier and text stay on the server.
export type PublicCard = {
  id: number; no: number; sprite: SpriteData; owned: boolean;
  name?: string; tier?: TierKey; description?: string; obtainedAt?: string;
};
export const TIER: Record<TierKey, { label: string; name: string; cls: string; rank: number }> = {
  C: { label: "C", name: "Common", cls: "tC", rank: 0 },
  B: { label: "B", name: "Rare", cls: "tB", rank: 1 },
  A: { label: "A", name: "Epic", cls: "tA", rank: 2 },
  S: { label: "S", name: "Legendary", cls: "tS", rank: 3 },
  S_PLUS: { label: "S+", name: "Mythic", cls: "tSp", rank: 4 },
  PRIME: { label: "PRIME", name: "Prime", cls: "tPr", rank: 5 },
  ABSOLUTE: { label: "ABS", name: "Absolute", cls: "tAb", rank: 6 },
  COLLECTOR: { label: "COLLECTOR", name: "Collector", cls: "tCo", rank: 7 },
};
export const TIER_KEYS = Object.keys(TIER) as TierKey[];
export const FUSABLE: TierKey[] = ["C", "B", "A", "S", "S_PLUS"];
export const WHITE_CAT: SpriteData = { pal: { a: "#ffffff", b: "#ffd1e3", e: "#c2185b", p: "#ff80ab" }, ov: [] };

// Profile borders: unlocked by owning this many different cards (duplicates do not count). Once unlocked they stay unlocked.
export type BorderKey = "PURPLE" | "RED" | "GOLD";
export const BORDERS: Record<BorderKey, { label: string; need: number; cls: string }> = {
  PURPLE: { label: "Border Ungu", need: 50, cls: "bdP" },
  RED: { label: "Border Merah", need: 100, cls: "bdR" },
  GOLD: { label: "Border Emas", need: 150, cls: "bdG" },
};
export const BORDER_KEYS = Object.keys(BORDERS) as BorderKey[];
export const isBorder = (v: unknown): v is BorderKey => typeof v === "string" && v in BORDERS;

// CHAT menu. A conversation is one other player (`who`), or null for the system notifications (gifts, borders).
export type Conv = { who: string | null; last: string; at: string; unread: number; mine: boolean; avatarUrl?: string | null; border?: string | null };
// The other player's profile picture and claimed border, shown next to their messages.
export type ChatPeer = { avatarUrl: string | null; border: string | null };
export type ChatMsg = { id: number; mine: boolean; body: string; at: string; read: boolean };

// What a card sells for, in coins, by tier (Sell menu).
export const SELL_PRICE: Record<TierKey, number> = { C: 10, B: 25, A: 80, S: 250, S_PLUS: 700, PRIME: 3000, ABSOLUTE: 10000, COLLECTOR: 50000 };

// Vouchers: blue and gold, each one with a cat head. Bought in the Shop with coins; the admin sets the prices.
export type VoucherKind = "blue" | "gold";
export const VOUCHER_KINDS: VoucherKind[] = ["blue", "gold"];
export const VOUCHER: Record<VoucherKind, { label: string }> = { blue: { label: "Voucher Biru" }, gold: { label: "Voucher Emas" } };
