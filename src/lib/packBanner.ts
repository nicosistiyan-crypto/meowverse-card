// Gambar pixel art statis untuk kartu pack di menu PACK (kemasan + box). Kemasannya memakai gambar yang sama persis dengan
// kemasan di animasi buka pack (drawPackScene di packArt.ts), jadi desainnya selalu sama; box dibuat sedikit berbeda (warna & tutup).
//   MV Pack 1 = kumpulan kemasan · MV Pack 2 = kemasan + box · MV Pack 3 = kumpulan box + kemasan · Collector = kemasan mewah per tier.
import { drawPackScene, PACK_W, PACK_H, PACK_SCALE } from "./packArt";
import { TIER, type TierKey } from "./types";

export const BANNER_W = 240;
export const BANNER_H = 135;
export const BANNER_SCALE = 3;
export type BannerKind = 1 | 2 | 3 | "collector";

// Jenis gambar dipilih dari nama pack (sama seperti stage11/12.sql yang mencocokkan pack lewat nama).
export function packKind(name: string): BannerKind {
  const n = name.toLowerCase();
  if (n.includes("collector")) return "collector";
  if (n.includes("pack 3")) return 3;
  if (n.includes("pack 2") || n === "premium cat pack") return 2;
  return 1;
}

const TIER_RGB: Record<TierKey, string> = { C: "#9aa5b1", B: "#4fc3f7", A: "#66bb6a", S: "#ffb300", S_PLUS: "#ff4081", PRIME: "#ff4f9a", ABSOLUTE: "#ff3d00", COLLECTOR: "#ffd23f" };
const OL = "#1b1033";

type Ctx = CanvasRenderingContext2D;
const R = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// gambar kemasan (96x128 x2) digambar sekali lalu dipakai ulang oleh semua kemasan dan box
let cache: HTMLCanvasElement | null = null;
function scene(): HTMLCanvasElement {
  if (cache) return cache;
  const cv = document.createElement("canvas");
  cv.width = PACK_W * PACK_SCALE; cv.height = PACK_H * PACK_SCALE;
  const c = cv.getContext("2d");
  if (c) drawPackScene(c);
  return (cache = cv);
}

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function sparkle(c: Ctx, x: number, y: number, col: string) {
  R(c, x, y - 2, 1, 5, col); R(c, x - 2, y, 5, 1, col); R(c, x, y, 1, 1, "#fff");
}

function background(c: Ctx, top: string[], seed: number, star: string[]) {
  const bh = Math.ceil(BANNER_H / top.length);
  top.forEach((col, i) => R(c, 0, i * bh, BANNER_W, bh + 1, col));
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * BANNER_W), y = Math.floor(r() * 100);
    if (i % 4 === 0) sparkle(c, x, y, star[i % star.length]); else R(c, x, y, 1, 1, star[i % star.length]);
  }
}

function floor(c: Ctx, base: string, edge: string, y = 124) {
  R(c, 0, y, BANNER_W, BANNER_H - y, base);
  R(c, 0, y, BANNER_W, 2, edge);
  for (let x = 0; x < BANNER_W; x += 12) R(c, x, y + 2, 1, BANNER_H - y, "rgba(0,0,0,.18)");
}

type Foil = { base: string; lite: string; dark: string };
const SILVER: Foil = { base: "#cfd2e6", lite: "#f4f5ff", dark: "#8f93b3" };
const GOLD: Foil = { base: "#ffd23f", lite: "#fff3b0", dark: "#b8860b" };

// Satu kemasan pack. `tier` (opsional) = versi mewah: bingkai emas, permata & semburat warna sesuai tier.
function wrapper(c: Ctx, x: number, y: number, w: number, h: number, tier?: TierKey) {
  const ch = 4, foil = tier ? GOLD : SILVER, bh = h - ch * 2;
  R(c, x + 2, y + h, w - 1, 2, "rgba(0,0,0,.35)");
  c.imageSmoothingEnabled = false;
  c.drawImage(scene(), x, y + ch, w, bh);
  if (tier) {
    const col = TIER_RGB[tier];
    c.globalAlpha = 0.34; R(c, x, y + ch + Math.round(bh * 0.55), w, bh - Math.round(bh * 0.55), col); c.globalAlpha = 1;
    R(c, x, y + ch, w, 2, foil.base); R(c, x, y + h - ch - 2, w, 2, foil.base);   // bingkai emas
    R(c, x, y + ch, 2, bh, foil.base); R(c, x + w - 2, y + ch, 2, bh, foil.base);
    R(c, x + 2, y + ch + 2, w - 4, 1, foil.lite); R(c, x + 2, y + ch + 2, 1, bh - 4, foil.lite);
    R(c, x + 2, y + h - ch - 3, w - 4, 1, foil.dark); R(c, x + w - 3, y + ch + 2, 1, bh - 4, foil.dark);
    [[x + 3, y + ch + 3], [x + w - 5, y + ch + 3], [x + 3, y + h - ch - 5], [x + w - 5, y + h - ch - 5]].forEach(([sx, sy]) => { R(c, sx, sy, 2, 2, foil.lite); });
    // permata di tengah atas, warnanya mengikuti tier
    const gx = Math.round(x + w / 2), gy = y + ch + 4;
    [1, 3, 5, 7, 5, 3, 1].forEach((n, i) => R(c, gx - (n - 1) / 2, gy + i, n, 1, col));
    R(c, gx - 2, gy + 1, 1, 1, "#fff"); R(c, gx - 1, gy + 2, 2, 1, "rgba(255,255,255,.7)");
    [[gx - 5, gy + 3], [gx + 5, gy + 3]].forEach(([sx, sy]) => R(c, sx, sy, 1, 1, foil.lite));
  }
  // crimp (sambungan foil) atas & bawah
  for (const top of [true, false]) {
    const cy = top ? y : y + h - ch;
    R(c, x, cy, w, ch, foil.base);
    for (let i = 0; i < w; i += 2) R(c, x + i, cy + (top ? 1 : 0), 1, ch - 1, foil.dark);
    R(c, x, top ? cy : cy + ch - 1, w, 1, foil.lite);
  }
  // kilau
  R(c, x + 3, y + ch + (tier ? 6 : 2), 2, bh - (tier ? 12 : 4), "rgba(255,255,255,.26)");
  R(c, x + 6, y + ch + (tier ? 6 : 2), 1, bh - (tier ? 12 : 4), "rgba(255,255,255,.13)");
  // garis tepi
  R(c, x - 1, y - 1, w + 2, 1, OL); R(c, x - 1, y + h, w + 2, 1, OL); R(c, x - 1, y, 1, h, OL); R(c, x + w, y, 1, h, OL);
}

type BoxTheme = { front: string; side: string; top: string; trim: string; band: string };
const BOX_RED: BoxTheme = { front: "#c2185b", side: "#7b0f3a", top: "#f06292", trim: "#ffd23f", band: "#7b0f3a" };
const BOX_BLUE: BoxTheme = { front: "#1e63d6", side: "#12397d", top: "#5b9cff", trim: "#ffd23f", band: "#12397d" };
const BOX_PURPLE: BoxTheme = { front: "#6a3fc8", side: "#3d2380", top: "#a07cf0", trim: "#ffe14a", band: "#3d2380" };
const BOX_TEAL: BoxTheme = { front: "#00897b", side: "#00504a", top: "#4db6ac", trim: "#ffd23f", band: "#00504a" };
const BOX_ORANGE: BoxTheme = { front: "#ef6c00", side: "#8f3d00", top: "#ffa040", trim: "#fff3b0", band: "#8f3d00" };

// Satu box pack (tampak depan, atas & samping). Bagian depan memakai gambar kemasan yang sama, ada tutup bergaris & pita di bawah.
function box(c: Ctx, x: number, y: number, w: number, h: number, t: BoxTheme) {
  const d = 8, fw = w - d, fh = h - d, ah = fh - 8;
  R(c, x + 2, y + h, w - 1, 2, "rgba(0,0,0,.35)");
  for (let j = 0; j < d; j++) R(c, x + fw + j, y + d - j, 1, fh, t.side);            // sisi kanan
  for (let k = 0; k < d; k++) R(c, x + d - k, y + k, fw, 1, t.top);                  // atas
  c.imageSmoothingEnabled = false;
  const sh = Math.min(256 - 40, Math.round((192 * ah) / fw));
  c.drawImage(scene(), 0, 40, 192, sh, x, y + d, fw, ah);                              // gambar depan
  R(c, x, y + d, fw, 3, t.trim); R(c, x, y + d + 3, fw, 1, OL);                        // tutup
  R(c, x, y + d, 2, fh, t.front); R(c, x + fw - 2, y + d, 2, fh, t.front);             // sudut
  R(c, x, y + d + ah, fw, fh - ah, t.band);                                           // pita bawah
  R(c, x, y + d + ah, fw, 1, t.trim);
  for (let i = 5; i < fw - 4; i += 12) { R(c, x + i, y + d + ah + 3, 3, 1, t.trim); R(c, x + i + 1, y + d + ah + 2, 1, 3, t.trim); }
  R(c, x + 3, y + d + 5, 1, ah - 6, "rgba(255,255,255,.2)");
  // garis tepi
  R(c, x - 1, y + d - 1, fw + 1, 1, OL); R(c, x - 1, y + d, 1, fh + 1, OL); R(c, x - 1, y + h, fw + 1, 1, OL); R(c, x + fw, y + d, 1, fh, OL);
  for (let k = 0; k < d; k++) { R(c, x + d - k - 1, y + k, 1, 1, OL); R(c, x + w - k, y + k, 1, 1, OL); }
  R(c, x + d, y - 1, fw, 1, OL);
  for (let j = 0; j < d; j++) R(c, x + fw + j + 1, y + h - j - 1, 1, 1, OL);
  R(c, x + w, y + 1, 1, fh - 1, OL);
}

function sorted(tiers: TierKey[]): TierKey[] {
  const t = tiers.filter((k) => k in TIER).sort((a, b) => TIER[b].rank - TIER[a].rank);   // tier tertinggi dulu
  return (t.length ? t : (["COLLECTOR", "ABSOLUTE", "PRIME", "S_PLUS"] as TierKey[])).slice(0, 5);
}

export function drawPackBanner(ctx: Ctx, kind: BannerKind, tiers: TierKey[] = []) {
  ctx.save();
  ctx.scale(BANNER_SCALE, BANNER_SCALE);
  ctx.imageSmoothingEnabled = false;

  if (kind === 1) {
    // kumpulan kemasan: 4 di belakang, 3 di depan
    background(ctx, ["#2b1b5e", "#33216d", "#3d2780", "#4a2f95"], 11, ["#fff", "#ffd23f", "#7ee8ff"]);
    floor(ctx, "#6a46b0", "#8d6ad8");
    [12, 66, 120, 174].forEach((x, i) => wrapper(ctx, x, 8 + (i % 2) * 3, 46, 61));
    [30, 93, 156].forEach((x, i) => wrapper(ctx, x, 54 + (i === 1 ? -2 : 0), 54, 72));
  } else if (kind === 2) {
    // kemasan + box-nya
    background(ctx, ["#0f3d6b", "#14497e", "#1a5896", "#2166ac"], 23, ["#fff", "#ffe14a", "#ff8fd0"]);
    floor(ctx, "#2f7bc4", "#5aa0e8");
    wrapper(ctx, 140, 30, 52, 70);
    wrapper(ctx, 174, 44, 56, 75);
    box(ctx, 14, 34, 108, 90, BOX_BLUE);
  } else if (kind === 3) {
    // kumpulan box (belakang) + kemasan (depan)
    background(ctx, ["#4a1230", "#591638", "#6a1b41", "#7b2149"], 37, ["#fff", "#ffd23f", "#ff9ec4"]);
    floor(ctx, "#8e2c5a", "#c2517f");
    box(ctx, 6, 6, 72, 62, BOX_PURPLE);
    box(ctx, 84, 6, 72, 62, BOX_TEAL);
    box(ctx, 162, 6, 72, 62, BOX_ORANGE);
    [22, 72, 122, 172].forEach((x, i) => wrapper(ctx, x, 72 + (i % 2) * 2, 40, 52));
  } else {
    // collector: kemasan mewah, satu per tier yang ada di pack ini (tier tertinggi di tengah dan paling besar)
    background(ctx, ["#0d0820", "#150b2c", "#241038", "#3a1a30", "#552400"], 51, ["#ffd23f", "#fff3b0", "#fff"]);
    const cx = 120, cy = 62;
    for (let y = 0; y < BANNER_H; y += 2) for (let x = 0; x < BANNER_W; x += 2) {   // sinar emas dari tengah
      const a = Math.atan2(y - cy, x - cx), dist = Math.hypot(x - cx, y - cy);
      if (dist > 20 && Math.floor(((a + Math.PI) / (Math.PI * 2)) * 18) % 2 === 0) R(ctx, x, y, 2, 2, `rgba(255,210,63,${Math.max(0.03, 0.14 - dist / 1400)})`);
    }
    R(ctx, 0, 118, BANNER_W, BANNER_H - 118, "#7a0f2a");                                   // karpet beludru
    R(ctx, 0, 118, BANNER_W, 2, "#ffd23f"); R(ctx, 0, 120, BANNER_W, 1, "#b8860b");
    for (let x = 4; x < BANNER_W; x += 10) { R(ctx, x, 126, 1, 1, "#ffd23f"); R(ctx, x - 1, 127, 3, 1, "#b8860b"); R(ctx, x, 128, 1, 1, "#ffd23f"); }
    const list = sorted(tiers), n = list.length, mid = (n - 1) / 2;
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);   // posisi dari tengah ke tepi
    const tierAt: Record<number, TierKey> = {};
    order.forEach((pos, k) => { tierAt[pos] = list[k]; });
    const dims = Array.from({ length: n }, (_, i) => { const s = 1 - 0.14 * Math.abs(i - mid); return { w: Math.round(60 * s), h: Math.round(80 * s) }; });
    const total = dims.reduce((s, d) => s + d.w, 0) - 6 * (n - 1);
    let x = Math.round((BANNER_W - total) / 2);
    const slots = dims.map((d) => { const s = { x, y: 116 - d.h, ...d }; x += d.w - 6; return s; });
    Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid)).forEach((i) => wrapper(ctx, slots[i].x, slots[i].y, slots[i].w, slots[i].h, tierAt[i]));
    const r = rng(9);
    for (let i = 0; i < 12; i++) sparkle(ctx, Math.floor(r() * 236) + 2, Math.floor(r() * 100) + 4, i % 2 ? "#fff3b0" : "#ffd23f");
  }
  ctx.restore();
}
