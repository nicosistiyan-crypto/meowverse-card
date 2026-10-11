// Animated pixel scenes for COLLECTOR cards.
// Every scene is drawn procedurally on a 60x80 canvas (same pixel size as the 16x16 cat sprites) and advanced by a frame counter (10 fps).
// No images, no dependencies: a card only stores the scene id in sprite_data.scene.

export type Ctx = { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void };
export const SCENE_W = 60;
export const SCENE_H = 80;
export const SCENE_IDS = ["donut_cafe", "moon_walk", "blossom_pair", "crazy_rich", "surf_cat"];
export const SCENE_FPS = 10;

type Pt = [number, number];

// ---------------------------------------------------------------- tiny drawing kit
const hs = (n: number): number => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));
const rgb = (h: string): number[] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (c: number[]): string => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number): string => { const x = rgb(a), y = rgb(b); return hex([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]); };
const vnoise = (x: number, y: number): number => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const n = (i: number, j: number) => hs(i * 57 + j * 131);
  return lerp(lerp(n(xi, yi), n(xi + 1, yi), u), lerp(n(xi, yi + 1), n(xi + 1, yi + 1), u), v);
};

class Pen {
  c: Ctx;
  constructor(c: Ctx) { this.c = c; }
  r(x: number, y: number, w: number, h: number, col: string): void {
    if (w <= 0 || h <= 0) return;
    this.c.fillStyle = col;
    this.c.fillRect(Math.round(x), Math.round(y), w, h);
  }
  p(x: number, y: number, col: string): void { this.r(x, y, 1, 1, col); }
  ell(cx: number, cy: number, rx: number, ry: number, col: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const half = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
      if (x1 > x0) this.r(x0, y, x1 - x0, 1, col);
    }
  }
  ellO(cx: number, cy: number, rx: number, ry: number, fill: string, out: string): void {
    this.ell(cx, cy, rx + 1, ry + 1, out);
    this.ell(cx, cy, rx, ry, fill);
  }
  poly(pts: Pt[], col: string): void {
    let y0 = Infinity, y1 = -Infinity;
    for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yy = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) this.r(a, y, b - a, 1, col); }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, col: string, th = 1): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const o = Math.floor(th / 2);
    for (let i = 0; i <= n; i++) this.r(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, th, th, col);
  }
  thick(x0: number, y0: number, x1: number, y1: number, th: number, col: string, out: string): void {
    this.line(x0, y0, x1, y1, out, th + 2);
    this.line(x0, y0, x1, y1, col, th);
  }
  // pixel bitmap: each char maps to a colour in `m`, '.' is transparent
  bmp(x: number, y: number, rows: string[], m: Record<string, string>): void {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = m[row[i]]; if (k) this.p(x + i, y + j, k); } });
  }
  ring(cx: number, cy: number, r0: number, r1: number, col: string): void {
    for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++)
      for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r0 && d <= r1) this.p(x, y, col);
      }
  }
}

// ---------------------------------------------------------------- the game's own cat sprite (16x16)
const BASE = ["................","..oo........oo..",".oaao......oaao.",".oaaoooooooaaao.",".oaaaaaaaaaaaao.",".oaaeaaaaaaeaao.",".oaaeaaaaaaeaao.",".oaaaaapppaaaao.","..oaaaaaaaaaao..","...oooooooooo...","..oaaaaaaaaaao..",".oaaaaaaaaaaaao.",".oaabaabbaabaao.",".oaaaaaaaaaaaao.",".owwoaaaaaaowwo.",".oooo......oooo."];
const FUR = { a: "#f59a3c", b: "#d9731f" };
const NAVY = "#2a1b33";
type Eyes = "open" | "happy" | "blink" | "wide";
type CatOpt = { s?: number; flip?: boolean; eyes?: Eyes; mouth?: 0 | 1 | 2; blush?: boolean; pal?: Record<string, string>; fix?: (g: string[][]) => void };

function catGrid(o: CatOpt): string[][] {
  const g = BASE.map((r) => r.split(""));
  const eyes = o.eyes ?? "open";
  for (const ex of [4, 11]) {
    const d = ex === 4 ? 1 : -1;
    if (eyes === "blink") { g[5][ex] = "a"; }
    else if (eyes === "happy") { g[5][ex] = "e"; g[6][ex] = "a"; g[6][ex - d] = "e"; g[6][ex + d] = "e"; }
    else if (eyes === "wide") { g[4][ex] = "e"; g[5][ex] = "e"; g[6][ex] = "e"; g[4][ex + d] = "w"; }
  }
  if (o.mouth === 1) { g[8][8] = "m"; g[8][7] = "m"; }
  if (o.mouth === 2) { g[8][6] = "m"; g[8][7] = "m"; g[8][8] = "t"; g[8][9] = "m"; g[8][10] = "m"; g[7][7] = "p"; }
  if (o.blush) { g[7][3] = "k"; g[7][12] = "k"; g[7][4] = "k"; g[7][11] = "k"; }
  if (o.fix) o.fix(g);
  return o.flip ? g.map((r) => r.slice().reverse()) : g;
}

function cat(p: Pen, x: number, y: number, o: CatOpt = {}): void {
  const s = o.s ?? 1;
  const pal: Record<string, string> = { o: NAVY, e: "#1b1b1b", p: "#ff8fa3", w: "#ffffff", m: "#6a1b2d", t: "#ff6f8e", k: "#ff8fa3", ...FUR, ...(o.pal ?? {}) };
  catGrid(o).forEach((row, j) => row.forEach((ch, i) => { const c = pal[ch]; if (c) p.r(x + i * s, y + j * s, s, s, c); }));
}

function bm(p: Pen, x: number, y: number, rows: string[], m: Record<string, string>, s = 1): void {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = m[row[i]]; if (c) p.r(x + i * s, y + j * s, s, s, c); } });
}

function heart(p: Pen, x: number, y: number, c1: string, c2 = "#ffffff"): void {
  bm(p, x, y, [".XX.XX.", "XHXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], { X: c1, H: c2 });
}
function spark(p: Pen, x: number, y: number, c: string): void { p.p(x, y, c); p.p(x - 1, y, c); p.p(x + 1, y, c); p.p(x, y - 1, c); p.p(x, y + 1, c); }

// ================================================================ SCENE 1: donut cafe (cat is the hero, background stays dim)
const GLYPH: Record<string, string[]> = { C: ["XXX", "X..", "X..", "X..", "XXX"], A: ["XXX", "X.X", "XXX", "X.X", "X.X"], F: ["XXX", "X..", "XX.", "X..", "X.."], E: ["XXX", "X..", "XX.", "X..", "XXX"] };
function tinyText(p: Pen, x: number, y: number, s: string, col: string): void {
  [...s].forEach((ch, i) => GLYPH[ch].forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === "X") p.p(x + i * 4 + k, y + j, col); }));
}
const ICING = ["#ff7eb6", "#8a4a2c", "#7ee8c8", "#fff1e0", "#ffd36b", "#c58cff"];
const SPR = ["#ffffff", "#ffe066", "#6ec8ff", "#ff5a7a", "#8dff8d"];
const DOUGH = "#e3a15a", DOUGH_OUT = "#4a2410";

const DONUT = ["..oooo..", ".oiiiio.", "oiiiiiio", "oiiHHiio", "oiiHHiio", "oiiiiiio", ".oiiiio.", "..oooo.."];
function donut8(p: Pen, x: number, y: number, icing: string, s: number, stage: number, f: number): void {
  DONUT.forEach((row, j) => { for (let i = 0; i < 8; i++) {
    let ch = row[i];
    if (ch === "." || ch === "H") continue;
    if (stage >= 1 && i >= 6 && j >= 1 && j <= 5) continue;
    if (stage >= 2 && i >= 4) continue;
    if (stage >= 1 && stage < 2 && i === 5 && j >= 1 && j <= 5) ch = "d";
    if (stage >= 2 && i === 3 && j >= 1 && j <= 6) ch = "d";
    const c = ch === "o" ? DOUGH_OUT : ch === "d" ? "#f6d6a0" : (i * 7 + j * 3) % 11 === 0 ? SPR[(i + j + Math.floor(f / 5)) % 5] : icing;
    p.r(x + i * s, y + j * s, s, s, c);
  } });
}
function sideDonut(p: Pen, x: number, y: number, icing: string, k: number): void {
  bm(p, x, y, [".oooooooooo.", "oiiiiiiiiiio", "oddddddddddo", ".oooooooooo."], { o: DOUGH_OUT, i: icing, d: DOUGH });
  p.p(x + 3 + (k % 3), y + 1, SPR[k % 5]); p.p(x + 8 - (k % 2), y + 1, SPR[(k + 2) % 5]);
}

function donutScene(p: Pen, f: number): void {
  const ph = f % 48;
  // ---- dim cafe background
  p.r(0, 0, 60, 80, "#2b1a26"); p.r(0, 28, 60, 20, "#331f2b"); p.r(0, 30, 60, 1, "#3b2531");
  for (let x = 3; x < 60; x += 9) p.r(x, 31, 1, 16, "#2f1d27");
  p.r(3, 4, 14, 20, "#3f2831"); p.r(4, 5, 12, 18, "#34405f"); p.r(4, 14, 12, 9, "#3b4870"); p.r(9, 5, 2, 18, "#3f2831"); p.r(4, 13, 12, 1, "#3f2831");
  tinyText(p, 20, 3, "CAFE", f % 30 < 26 ? "#6b3550" : "#4e2840");
  const fl = f % 24 < 12;
  p.r(50, 0, 1, 7, "#241420"); p.poly([[45, 12], [56, 12], [53, 7], [48, 7]], "#4c3028"); p.ell(50.5, 14, 6, 3, fl ? "#40292a" : "#46302c");
  p.r(41, 28, 18, 1, "#4a2f35"); for (const cx of [43, 49, 55]) { p.r(cx, 24, 3, 4, "#50373a"); p.p(cx + 3, 25, "#50373a"); }
  [[6, 36, 2], [56, 40, 2], [26, 12, 1], [40, 20, 2]].forEach(([bx, by, br], i) => p.ell(bx, by, br, br, (f + i * 5) % 20 < 10 ? "#4a3033" : "#563a36"));

  p.ell(30, 34, 27, 20, "#3a2430"); p.ell(30, 34, 20, 14, "#43282f");   // soft light behind the hero cat
  // ---- cat (hero, drawn at 2x like the other cats' face detail)
  const tail = Math.round(Math.sin(f * 0.25) * 2);
  p.thick(14, 44, 7, 36 + tail, 3, "#f59a3c", NAVY); p.thick(7, 36 + tail, 8, 30 + tail, 3, "#f59a3c", NAVY);

  let dy = 52, stage = 0, has = true;
  let eyes: Eyes = "open", mouth: 0 | 1 | 2 = 0, blush = true;
  if (ph < 6) { dy = 52; eyes = ph === 3 ? "blink" : "open"; }
  else if (ph < 13) { dy = lerp(52, 33, (ph - 6) / 6); eyes = "wide"; mouth = ph >= 11 ? 2 : 1; }
  else if (ph === 13) { dy = 33; eyes = "happy"; mouth = 2; }
  else if (ph < 22) { dy = ph < 16 ? lerp(33, 38, (ph - 14) / 2) : 38; stage = 1; eyes = "happy"; mouth = ph % 2 ? 1 : 0; }
  else if (ph < 24) { dy = lerp(38, 33, (ph - 21) / 2); stage = 1; eyes = "wide"; mouth = 1; }
  else if (ph === 24) { dy = 33; stage = 1; eyes = "happy"; mouth = 2; }
  else if (ph < 33) { dy = ph < 27 ? lerp(33, 38, (ph - 25) / 2) : 38; stage = 2; eyes = "happy"; mouth = ph % 2 ? 1 : 0; }
  else if (ph < 35) { dy = lerp(38, 33, (ph - 32) / 2); stage = 2; eyes = "wide"; mouth = 1; }
  else if (ph === 35) { dy = 33; stage = 2; eyes = "happy"; mouth = 2; }
  else if (ph < 42) { has = false; dy = lerp(33, 50, (ph - 36) / 6); eyes = "happy"; mouth = ph % 2 ? 1 : 0; }
  else if (ph === 42) { has = false; dy = 52; eyes = "wide"; }
  else if (ph === 43) { has = false; dy = 52; eyes = "happy"; mouth = 1; }
  else { has = false; dy = 52; }
  const bob = ph >= 14 && ph < 42 && ph % 2 ? 1 : 0;
  cat(p, 14, 16 + bob, { s: 2, eyes, mouth, blush });
  if (ph >= 14 && ph < 42) { const c = ph % 2; p.r(11, 33 + bob - c, 3, 3, "#f59a3c"); p.r(46, 33 + bob - c, 3, 3, "#f59a3c"); }  // puffed cheeks

  // ---- table + donut piles
  p.r(0, 46, 60, 34, "#8c5a34"); p.r(0, 46, 60, 4, "#d9964f"); p.r(0, 46, 60, 1, "#efb070");
  for (const y of [60, 69, 76]) for (let x = (y % 4) * 5; x < 60; x += 17) p.r(x, y, 9, 1, "#7a4c2c");
  for (let k = 0; k < 7; k++) sideDonut(p, 1 + (k % 2), 43 - k * 3, ICING[k % 6], k);
  for (let k = 0; k < 6; k++) sideDonut(p, 46 + (k % 2), 43 - k * 3, ICING[(k + 2) % 6], k + 3);
  p.ell(30, 64, 15, 4, "#efe6d8"); p.ell(30, 64, 12, 3, "#d8cdbc");
  donut8(p, 3, 56, ICING[0], 1, 0, f); donut8(p, 47, 60, ICING[2], 1, 0, f); donut8(p, 40, 70, ICING[4], 1, 0, f); donut8(p, 8, 68, ICING[5], 1, 0, f);
  if (ph < 6 || ph >= 44) donut8(p, 22, 52, ICING[(Math.floor(f / 48) + 1) % 6], 2, 0, f);

  // ---- arms, paws, the donut being eaten
  const icing = ICING[Math.floor(f / 48) % 6], hy = Math.round(dy) + 8;
  p.thick(18, 42, 21, hy, 3, "#f59a3c", NAVY); p.thick(42, 42, 39, hy, 3, "#f59a3c", NAVY);
  if (has && ph >= 6 && ph < 44) donut8(p, 22, Math.round(dy), icing, 2, stage, f);
  p.r(19, hy - 2, 4, 4, NAVY); p.r(20, hy - 1, 2, 2, "#ffffff"); p.r(38, hy - 2, 4, 4, NAVY); p.r(39, hy - 1, 2, 2, "#ffffff");

  // ---- crumbs, sparkles
  for (const b of [13, 24, 35]) {
    const age = ph - b;
    if (age >= 0 && age < 12) for (let k = 0; k < 6; k++) {
      const x = 30 + ((k * 7) % 11) - 5 + (k % 2 ? 1 : -1) * age * 0.3, y = 36 + age * 1.6 + (k % 3);
      if (y < 49) p.p(x, y, k % 3 === 0 ? DOUGH : k % 3 === 1 ? icing : "#f6d6a0");
    }
  }
  if (ph >= 14 && ph < 42) { if (f % 4 < 2) { spark(p, 6, 20, "#ffe27a"); spark(p, 54, 24, "#ffe27a"); } else { spark(p, 8, 28, "#fff3b0"); spark(p, 52, 16, "#fff3b0"); } }
  if (ph >= 42) { const a = ph - 42; heart(p, 4, 30 - a * 2, "#ff6f9f"); heart(p, 50, 24 - a * 2, "#ff9ec0"); }
}

// ================================================================ SCENE 2: astronaut cat on the moon
function earth(p: Pen, cx: number, cy: number, R: number, f: number): void {
  const rot = f * 0.035, L = [-0.55, -0.5, 0.67];
  p.ell(cx, cy, R + 2, R + 2, "#16275e"); p.ell(cx, cy, R + 1, R + 1, "#2a4a9a");
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / R, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2), lat = Math.asin(ny), lon = Math.atan2(nx, nz) + rot;
      const land = vnoise(lon * 2.1 + 3, lat * 2.4 + 5) * 0.65 + vnoise(lon * 4.2, lat * 4.8) * 0.35;
      let col = land > 0.55 ? (Math.abs(lat) > 1.15 ? "#f2f6ff" : land > 0.66 ? "#2e7d32" : "#4caf50") : "#2f6fd6";
      if (vnoise(lon * 3.2 + 40 + rot * 0.8, lat * 5.5 + 7) > 0.64) col = mix(col, "#ffffff", 0.88);
      const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      p.p(x, y, mix("#050a1e", col, Math.round((0.3 + 0.7 * lam) * 4) / 4));
    }
}

function moonWalk(p: Pen, f: number): void {
  p.r(0, 0, 60, 80, "#07061a"); p.r(0, 34, 60, 24, "#0c0a26");
  for (let layer = 0; layer < 3; layer++) {
    const sp = [0.1, 0.25, 0.5][layer];
    for (let i = 0; i < 11; i++) {
      const sx = ((hs(layer * 40 + i) * 60 - f * sp) % 60 + 60) % 60, sy = hs(layer * 77 + i * 3) * 54;
      p.p(sx, sy, (f + i * 3) % (14 + layer * 4) < 2 ? "#ffffff" : ["#5a64a8", "#98a4e0", "#e8ecff"][layer]);
      if (layer === 2 && i % 4 === 0) { p.p(sx - 1, sy, "#8a94d8"); p.p(sx + 1, sy, "#8a94d8"); p.p(sx, sy - 1, "#8a94d8"); p.p(sx, sy + 1, "#8a94d8"); }
    }
  }
  [[34, 4, 8], [50, 18, 30], [44, 44, 14]].forEach(([per, x0, y0], i) => {
    const a = (f + i * 13) % per;
    if (a < 12) {
      const hx = x0 + 44 - a * 4, hy = y0 + a * 2;
      ["#ffffff", "#cfe6ff", "#8fb4ee", "#506cb0", "#34457a"].forEach((c, j) => p.r(hx + j * 3, hy - j * 1.5, j < 2 ? 2 : 1, 1, c));
    }
  });
  earth(p, 43, 17, 11, f);
  const hz = (x: number): number => 56 + ((x - 30) * (x - 30)) / 80;
  for (let x = 0; x < 60; x++) {
    const y0 = Math.round(hz(x));
    p.r(x, y0, 1, 80 - y0, "#9a9aa8"); p.r(x, y0, 1, 1, "#d2d2de"); p.r(x, y0 + 1, 1, 1, "#b4b4c2");
  }
  p.r(0, 66, 60, 6, "#8e8e9c"); p.r(0, 72, 60, 8, "#7a7a88");
  for (let i = 0; i < 40; i++) { const x = hs(i) * 60, y = 60 + hs(i + 90) * 20; if (y > hz(x) + 2) p.p(x, y, hs(i + 5) > 0.5 ? "#b0b0be" : "#74748a"); }
  const crater = (cx: number, cy: number, rx: number, ry: number): void => { p.ell(cx, cy, rx + 1, ry + 1, "#b8b8c8"); p.ell(cx, cy + 0.5, rx, ry, "#6a6a7c"); p.ell(cx - 1, cy + 1, Math.max(1, rx - 2), Math.max(1, ry - 1), "#5c5c6e"); };
  crater(9, 68, 6, 2); crater(48, 74, 7, 2); crater(36, 63, 3, 1); crater(18, 76, 4, 1);
  p.poly([[40, 66], [43, 63], [46, 66]], "#8a8a9c"); p.poly([[40, 66], [43, 64], [43, 66]], "#b0b0c0");
  for (const [fx, fy] of [[20, 74], [16, 71], [12, 68]]) { p.r(fx, fy, 1, 2, "#6e6e82"); p.r(fx + 3, fy - 1, 1, 2, "#6e6e82"); }
  // flag
  p.r(52, 38, 1, 24, "#d8d8e8");
  for (let x = 0; x < 7; x++) { const w = Math.round(Math.sin(f * 0.4 - x * 0.7)); p.r(53 + x, 38 + w, 1, 6, "#e8453c"); p.p(53 + x, 38 + w, "#ff7a6a"); }
  p.bmp(55, 40, ["X.X", "XXX"], { X: "#ffffff" });

  // astronaut cat
  const t = f % 50, h = t < 24 ? Math.round(6 * Math.sin((Math.PI * t) / 24)) : 0;
  const ax = 20, ay = 42 - h, gy = 58;
  p.ell(ax + 8, gy + 2, 9 - h * 0.6, 2, "#5a5a70");
  if (t >= 24 && t < 36) { const a = t - 24; [-1, 1].forEach((s) => p.ell(ax + 8 + s * (6 + a * 0.8), gy + 1 - a * 0.2, 2 + a * 0.2, 1 + a * 0.1, a > 8 ? "#8a8a9c" : "#b4b4c4")); }
  p.r(ax + 14, ay + 9, 4, 6, "#a8a8bf"); p.r(ax + 14, ay + 9, 4, 1, "#d0d0e0");                     // backpack
  p.ell(ax + 8, ay + 5, 8, 7, "#2a3a78"); p.ell(ax + 8, ay + 7, 7, 4, "#1c2a60");                   // helmet glass
  cat(p, ax, ay, { eyes: f % 40 > 36 ? "blink" : "open", mouth: t >= 24 && t < 30 ? 1 : 0, blush: true,
    fix: (g) => { for (let j = 10; j <= 14; j++) for (let i = 0; i < 16; i++) { if (g[j][i] === "a") g[j][i] = "s"; if (g[j][i] === "b") g[j][i] = "g"; if (g[j][i] === "w") g[j][i] = "g"; } },
    pal: { s: "#f2f2fa", g: "#c4c4d8" } });
  const wv = Math.sin(f * 0.55);
  p.thick(ax + 14, ay + 11, ax + 17 + wv, ay + 7 + wv * 1.5, 2, "#f2f2fa", NAVY); p.r(ax + 16 + wv, ay + 5 + wv * 1.5, 3, 3, "#ffd0a8");
  // helmet rim
  for (let y = ay - 4; y <= ay + 14; y++) for (let x = ax - 4; x <= ax + 20; x++) {
    const u = (x + 0.5 - (ax + 8)) / 9.4, v = (y + 0.5 - (ay + 5)) / 8.6, d = u * u + v * v;
    if (d <= 1 && d >= 0.72) p.p(x, y, d > 0.93 ? NAVY : "#e6e6f2");
  }
  const g = (f % 30) - 6;
  if (g >= 0 && g < 10) for (let k = 0; k < 5; k++) p.p(ax + 2 + g * 0.8 + k * 0.5, ay + 2 + k, "#b8c8ff");
  p.r(ax + 2, ay - 2, 3, 1, "#ffffff"); p.p(ax, ay, "#ffffff");
  p.r(ax + 13, ay - 5, 1, 4, "#c4c4d8"); p.p(ax + 13, ay - 6, f % 10 < 5 ? "#ff3b3b" : "#7a2a2a");
}

// ================================================================ SCENE 3: a pair among pink flowers
function blossomPair(p: Pen, f: number): void {
  ["#8fc4ff", "#a8d0ff", "#c4dcff", "#dfe6ff", "#f7e3f2", "#ffdcd8", "#ffd2b8"].forEach((c, i) => p.r(0, i * 6, 60, 7, c));
  const gl = f % 40 < 20 ? 0 : 1;
  p.ell(40, 31, 10 + gl, 10 + gl, "#ffe9d0"); p.ell(40, 31, 7, 7, "#fff0c8"); p.ell(40, 31, 4.5, 4.5, "#fff7b8");
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + f * 0.02; p.p(40 + Math.cos(a) * 14, 31 + Math.sin(a) * 14, "#fff3c8"); }
  [[8, 10, 0.1, 8], [38, 18, 0.15, 6], [26, 4, 0.07, 5]].forEach(([x0, y0, sp, w]) => {
    const x = ((x0 + f * sp) % 80) - 10;
    p.ell(x, y0, w, 2.5, "#ffffff"); p.ell(x - w * 0.4, y0 - 1.5, w * 0.45, 2, "#ffffff"); p.ell(x + w * 0.3, y0 - 2, w * 0.5, 2.5, "#ffffff"); p.r(x - w + 2, y0 + 2, w * 2 - 4, 1, "#f1deef");
  });
  for (let x = 0; x < 60; x++) {
    const m1 = 34 + 5 * Math.sin(x * 0.11 + 1) + 3 * Math.sin(x * 0.26 + 2), m2 = 39 + 4 * Math.sin(x * 0.08 + 4) + 2 * Math.sin(x * 0.3);
    p.r(x, Math.round(m1), 1, 20, "#c5b4ea"); p.r(x, Math.round(m1) + 4, 1, 20, "#d4c5ef");
    p.r(x, Math.round(m2), 1, 20, "#a995dc"); p.r(x, Math.round(m2), 1, 1, "#c0b0ee");
  }
  p.r(0, 42, 60, 3, "#e8d6f2");
  p.r(0, 44, 60, 36, "#86cf94"); p.r(0, 54, 60, 26, "#74c286"); p.r(0, 66, 60, 14, "#62b479");
  const tree = (tx: number, ty: number): void => {
    p.r(tx - 1, ty, 3, 26, "#6b4a3a"); p.r(tx - 1, ty, 1, 26, "#85604c");
    [[0, 0, 8], [-6, 5, 6], [6, 5, 6], [-2, -6, 5], [3, -4, 5]].forEach(([ox, oy, r], i) => { p.ell(tx + ox, ty + oy, r, r * 0.85, i % 2 ? "#ffa8c8" : "#ff9ec0"); p.ell(tx + ox - 1, ty + oy - 1, r * 0.55, r * 0.45, "#ffc4da"); });
    for (let k = 0; k < 6; k++) if ((f + k * 3) % 14 < 3) p.p(tx - 8 + hs(k + tx) * 16, ty - 8 + hs(k * 3 + tx) * 16, "#ffffff");
  };
  tree(5, 24); tree(55, 28);

  const bob = f % 30 < 15 ? 0 : 1, cy = 47, ax = 14, bx = 29;
  const tl = Math.round(Math.sin(f * 0.18) * 2);
  p.thick(ax + 2, cy + 14, ax - 3, cy + 14, 2, "#f59a3c", NAVY); p.thick(ax - 3, cy + 14, ax - 4 + tl, cy + 11, 2, "#f59a3c", NAVY);
  p.thick(bx + 13, cy + 14, bx + 18, cy + 14, 2, "#f59a3c", NAVY); p.thick(bx + 18, cy + 14, bx + 19 - tl, cy + 11, 2, "#f59a3c", NAVY);
  cat(p, ax, cy + bob, { eyes: f % 50 > 22 && f % 50 < 25 ? "blink" : "happy", blush: true });
  cat(p, bx, cy + bob, { eyes: f % 50 > 46 ? "blink" : "happy", blush: true, flip: true });
  bm(p, bx + 10, cy + bob - 1, ["XX.XX", "XXHXX", "XX.XX"], { X: "#ff6fa5", H: "#ffe66d" });   // bow
  bm(p, ax + 1, cy + bob - 1, [".X.", "XHX", ".X."], { X: "#ff4f8f", H: "#ffe66d" });          // flower in the ear
  for (let k = 0; k < 2; k++) { const a = (f + k * 20) % 40; if (a < 34) heart(p, 26 + Math.round(Math.sin(a * 0.3) * 2), 43 - a * 0.5, a > 24 ? "#ffb4cc" : "#ff5f93"); }

  const PINKS = ["#ff6fa5", "#ff8fb8", "#ffb3cf", "#ff4f8f"];
  for (let row = 0; row < 11; row++) {
    const y = 46 + row * 3.4, size = row < 3 ? 1 : row < 7 ? 2 : 3;
    for (let x = (row % 2) * 3; x < 64; x += size === 3 ? 7 : size === 2 ? 5 : 4) {
      const sx = x + Math.round(Math.sin(f * 0.16 + row * 0.8 + x * 0.12) * (size > 1 ? 1 : 0.5)), yy = Math.round(y);
      if (sx > 9 && sx < 48 && yy > 42 && yy < 66) continue;                       // keep the couple visible
      const c = PINKS[(x * 7 + row * 3) % 4];
      if (size === 1) p.r(sx, yy, 2, 1, c);
      else if (size === 2) { p.r(sx, yy - 1, 1, 3, c); p.r(sx - 1, yy, 3, 1, c); p.p(sx, yy, "#ffe66d"); }
      else { p.r(sx - 1, yy - 1, 3, 3, c); p.p(sx, yy - 2, c); p.p(sx, yy + 2, c); p.p(sx - 2, yy, c); p.p(sx + 2, yy, c); p.p(sx, yy, "#ffe66d"); p.r(sx, yy + 3, 1, 2, "#3f9a5a"); }
    }
  }
  for (let k = 0; k < 10; k++) {
    const x = ((hs(k) * 70 + f * (0.3 + hs(k + 3) * 0.4) + Math.sin(f * 0.1 + k) * 3) % 70) - 5, y = (hs(k + 9) * 90 + f * (0.5 + hs(k + 4) * 0.4)) % 90;
    p.r(x, y, 2, 1, k % 3 === 0 ? "#ffffff" : k % 3 === 1 ? "#ffd0e0" : "#ff9ec0");
  }
  [[14, 38, 0.07, 0], [46, 48, 0.09, 9]].forEach(([bx2, by, sp, off]) => {
    const x = bx2 + 8 * Math.sin((f + off) * sp), y = by + 4 * Math.sin((f + off) * sp * 1.9), w = (f + off) % 4 < 2;
    p.p(x, y, "#3a2a5a"); p.r(x - 2, y - (w ? 2 : 1), 2, w ? 2 : 1, "#7ec8ff"); p.r(x + 1, y - (w ? 2 : 1), 2, w ? 2 : 1, "#bfe6ff");
  });
  for (let k = 0; k < 5; k++) if ((f + k * 5) % 16 < 3) p.p(4 + hs(k + 20) * 52, 58 + hs(k + 30) * 18, "#fff6a0");
}

// ================================================================ shared helpers for the two newest scenes
function bands(p: Pen, cols: string[], y0: number, h: number): void {
  const bh = h / cols.length;
  cols.forEach((c, i) => p.r(0, Math.round(y0 + i * bh), 60, Math.ceil(bh) + 1, c));
  for (let i = 1; i < cols.length; i++) {
    const by = Math.round(y0 + i * bh);
    for (let x = (i % 2); x < 60; x += 2) p.p(x, by, cols[i - 1]);
  }
}
function bag(p: Pen, x: number, y: number, c1: string, c2: string): void {
  p.r(x + 1, y, 1, 2, "#3a2a1a"); p.r(x + 4, y, 1, 2, "#3a2a1a"); p.r(x + 1, y, 4, 1, "#3a2a1a");
  p.r(x, y + 2, 6, 6, NAVY); p.r(x + 1, y + 3, 4, 4, c1); p.r(x + 1, y + 3, 4, 1, c2); p.p(x + 2, y + 5, "#ffe27a"); p.p(x + 3, y + 5, "#ffe27a");
}

// ================================================================ SCENE 4: Crazy Rich Cat on the terrace of a super-mansion (black helicopter + sports car)
function richFace(g: string[][], glint: number): void {
  // mirror aviators: dark-blue lens, lighter lower half, gold frame, sheen that sweeps across
  for (let i = 2; i <= 13; i++) { g[5][i] = "G"; g[6][i] = "j"; }
  g[6][7] = "a"; g[6][8] = "a"; g[5][7] = "F"; g[5][8] = "F";
  g[5][2] = "F"; g[5][13] = "F"; g[4][2] = "F"; g[4][13] = "F";
  g[5][3] = "h"; g[5][10] = "h";
  if (glint >= 0) for (const k of [glint, glint + 7]) { if (k >= 2 && k <= 13 && k !== 7 && k !== 8) g[5][k] = "H"; const k2 = k - 1; if (k2 >= 2 && k2 <= 13 && k2 !== 7 && k2 !== 8) g[6][k2] = "H"; }
  // tuxedo + shirt + gold chain with pendant
  for (let j = 10; j <= 14; j++) for (let i = 0; i < 16; i++) { if (g[j][i] === "a") g[j][i] = "T"; if (g[j][i] === "b") g[j][i] = "U"; }
  g[10][6] = "F"; g[10][7] = "F"; g[10][8] = "F"; g[10][9] = "F";
  for (let j = 11; j <= 13; j++) { g[j][7] = "W"; g[j][8] = "W"; }
  g[12][7] = "F"; g[12][8] = "F";
  // smirk with a gold tooth
  g[8][6] = "m"; g[8][7] = "m"; g[8][8] = "m"; g[8][9] = "F"; g[7][7] = "p";
}
function girlFace(g: string[][], dress: string, dress2: string): void {
  g[4][3] = "o"; g[4][12] = "o"; g[8][7] = "L"; g[8][8] = "L";
  g[7][3] = "k"; g[7][12] = "k";
  // hair bow on one ear + pearl necklace
  g[1][12] = "X"; g[1][13] = "X"; g[2][12] = "X"; g[2][13] = "X";
  for (let j = 10; j <= 14; j++) for (let i = 0; i < 16; i++) { if (g[j][i] === "a") g[j][i] = dress; if (g[j][i] === "b") g[j][i] = dress2; }
  for (let i = 5; i <= 10; i++) g[10][i] = "P";
}

function crazyRich(p: Pen, f: number): void {
  const T = (f * Math.PI * 2) / 240; // 240 frames = one seamless loop
  const hopL = Math.sin(T * 10) > 0.7 ? 1 : 0, hopR = Math.sin(T * 10 + 3) > 0.7 ? 1 : 0;
  const CREAM = "#efe6d2", CSH = "#cfc2a6", GOLD = "#ffd23f", GOLD2 = "#b8861c";

  // ---- golden-hour sky, sun peeking over the east wing, clouds and birds
  bands(p, ["#2b1f5e", "#5a2f86", "#a2437f", "#e46a6a", "#ff9a5a", "#ffc878", "#ffe2a0"], 0, 38);
  for (let i = 0; i < 8; i++) p.p(hs(i * 5) * 58, hs(i * 5 + 1) * 9, (f + i * 5) % 12 < 2 ? "#ffffff" : "#b89ae0");
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + T;
    for (let r = 9; r < (k % 2 ? 14 : 19); r++) { const x = 50 + Math.cos(a) * r, y = 29 + Math.sin(a) * r; if (y < 27 && (r + k) % 3 !== 0) p.p(x, y, "#ffd890"); }
  }
  p.ell(50, 29, 8 + (f % 24 < 12 ? 0 : 1), 8 + (f % 24 < 12 ? 0 : 1), "#ffb070"); p.ell(50, 29, 6, 6, "#ffd878"); p.ell(50, 29, 4, 4, "#fff2b8");
  [[6, 8, 0.35, 9], [34, 17, 0.7, 7], [20, 13, 0.35, 6]].forEach(([x0, y0, sp, w]) => {
    const x = ((x0 + f * sp) % 84) - 12;
    p.ell(x, y0, w, 2, "#e0807c"); p.ell(x - w * 0.3, y0 - 1.5, w * 0.5, 1.8, "#f09a8c"); p.r(x - w + 2, y0 + 1, w * 2 - 4, 1, "#ffb89a");
  });
  for (let k = 0; k < 2; k++) {
    const gx = ((f * 0.65 + k * 33) % 78) - 8, gy = 6 + k * 7 + Math.round(Math.sin(T * 16 + k) * 1.5), up = f % 4 < 2;
    p.p(gx, gy, "#3a2040"); p.r(gx - 2, gy - (up ? 1 : 0), 2, 1, "#3a2040"); p.r(gx + 1, gy - (up ? 1 : 0), 2, 1, "#3a2040");
  }

  // ---- the super-mansion: main block with gold columns, glowing glass, grand door
  p.r(0, 11, 37, 2, GOLD); p.r(0, 13, 37, 1, GOLD2);
  p.r(0, 14, 36, 30, CREAM); p.r(0, 14, 36, 2, CSH);
  const bays: [number, number][] = [[2, 9], [13, 10], [25, 9]];
  bays.forEach(([bx, w], bi) => {
    const lit = (f + bi * 20) % 120 < 100 ? "#ffd890" : "#ffc070";
    // upper window + balcony
    p.r(bx, 17, w, 10, GOLD2); p.r(bx + 1, 18, w - 2, 8, lit); p.r(bx + 1, 18, w - 2, 3, "#fff0c0"); p.r(bx + Math.floor(w / 2), 18, 1, 8, GOLD2);
    p.r(bx - 1, 27, w + 2, 1, GOLD); for (let x = bx; x < bx + w; x += 2) p.p(x, 28, "#fffaf0");
    p.r(bx - 1, 29, w + 2, 1, GOLD2);
    if (bi === 1) { // grand door
      p.r(bx + 1, 32, w - 2, 12, GOLD2); p.r(bx + 2, 33, w - 4, 11, "#ffe9a8"); p.r(bx + Math.floor(w / 2), 33, 1, 11, GOLD2);
      p.r(bx + 3, 31, w - 6, 1, GOLD2); p.p(bx + 4, 38, "#7a4a00"); p.p(bx + w - 5, 38, "#7a4a00");
    } else {
      p.r(bx, 32, w, 12, GOLD2); p.r(bx + 1, 33, w - 2, 11, lit); p.r(bx + 1, 33, w - 2, 4, "#fff0c0"); p.r(bx + Math.floor(w / 2), 33, 1, 11, GOLD2);
    }
  });
  for (const cx of [0, 11, 23, 34]) {
    p.r(cx, 14, 2, 30, "#fffaf0"); p.r(cx + 1, 14, 1, 30, CSH); p.r(cx - 1, 14, 4, 1, GOLD); p.r(cx - 1, 43, 4, 1, GOLD);
  }
  p.r(0, 44, 37, 1, CSH);
  // east wing (low, dark glass strip) - the helicopter parks in front of it
  p.r(36, 27, 24, 1, GOLD); p.r(36, 28, 24, 16, CREAM); p.r(36, 28, 1, 16, CSH);
  p.r(38, 33, 21, 5, "#2c3a68"); p.r(38, 33, 21, 1, "#5a78c0"); for (let x = 40; x < 59; x += 6) p.r(x, 34, 2, 1, "#8aa8e8");

  // ---- driveway + lawn, helipad with blinking lights
  p.r(0, 44, 36, 6, "#5a5a68"); p.r(0, 44, 36, 1, "#7a7a88");
  for (let x = 2; x < 34; x += 8) p.r(x, 49, 4, 1, "#8a8a98");
  p.r(36, 44, 24, 6, "#2f8a4e"); for (let x = 37; x < 60; x += 3) p.p(x, 45 + (x % 2), "#4aa862");
  p.ell(37, 45, 2, 2, "#2e8a4a"); p.ell(37, 45, 1, 1, "#58b870");
  p.ell(48, 47, 11, 3, "#2c2c38"); p.ell(48, 47, 10, 2, "#4e4e5c");
  [[38, 47], [41, 49], [48, 50], [55, 49], [58, 47], [41, 45], [55, 45]].forEach(([lx, ly], i) => p.p(lx, ly, (f + i * 4) % 12 < 6 ? "#ffe27a" : "#7a6020"));

  // ---- parked black helicopter (nose toward the cats)
  p.r(41, 46, 13, 1, "#1c1c24"); p.r(43, 42, 1, 4, "#1c1c24"); p.r(51, 42, 1, 4, "#1c1c24"); p.p(40, 45, "#1c1c24");
  p.r(52, 38, 7, 2, "#101016"); p.r(58, 32, 2, 7, "#101016"); p.r(56, 36, 3, 3, "#101016"); p.r(58, 33, 1, 1, "#2a2a36");
  if (f % 2) p.r(59, 33, 1, 5, "#8a8a96"); else p.r(57, 35, 3, 1, "#8a8a96");
  p.ell(46, 40, 7, 4, "#101016"); p.r(42, 37, 9, 1, "#2a2a36"); p.r(43, 43, 8, 1, "#06060a");
  p.r(43, 41, 9, 1, GOLD);
  p.ell(42, 39, 3, 2.5, "#3a68a8"); p.r(41, 37, 3, 1, "#a8d8ff"); p.p(41, 39, "#7ab0e8");
  if (f % 40 < 4) spark(p, 41, 38, "#ffffff");
  p.r(46, 33, 2, 3, "#202028"); p.r(45, 32, 4, 1, "#3a3a46");
  const sw = Math.sin(T * 20) > 0 ? 1 : 0;
  p.line(46, 32, 33, 34 + sw, "#101016", 1); p.line(47, 32, 59, 34 + sw, "#101016", 1); p.line(46, 33, 34, 35 + sw, "#2a2a36", 1);
  if (f % 12 < 3) p.p(58, 31, "#ff3030");

  // ---- red supercar: low wedge body, raked windshield, side intake, rear wing, gold wheels
  p.ell(17, 49.5, 15, 1.2, "#25252e");
  p.poly([[3, 47], [3, 43], [8, 42], [14, 39], [20, 38], [24, 39], [31, 44], [33, 46], [32, 47]], "#d4202c");
  p.poly([[8, 42], [14, 39], [20, 38], [24, 39], [26, 41], [10, 43]], "#e8343c");
  p.line(14, 39, 20, 38, "#ffa0a0", 1); p.line(20, 38, 24, 39, "#ffa0a0", 1); p.line(24, 39, 31, 44, "#ff7a7a", 1);
  p.poly([[15, 41], [20, 39], [23, 39], [28, 43], [16, 43]], "#14203c"); p.line(16, 40, 20, 39, "#7a98e0", 1); p.r(21, 40, 1, 3, "#d4202c");
  p.r(5, 43, 5, 1, "#8a1018"); p.r(5, 44, 5, 1, "#8a1018"); p.r(6, 43, 3, 1, "#101014");
  p.poly([[13, 44], [19, 44], [20, 46], [13, 46]], "#101014"); p.r(14, 45, 4, 1, "#3a3a46");
  p.r(4, 45, 28, 1, GOLD); p.r(3, 47, 30, 1, "#101014"); p.r(30, 47, 4, 1, "#101014");
  p.r(2, 40, 7, 1, "#101014"); p.r(3, 41, 1, 2, "#101014"); p.r(7, 41, 1, 2, "#101014");
  p.r(24, 41, 2, 1, "#101014");
  for (const wx of [9, 26]) { p.ell(wx, 46.5, 3.6, 3.2, "#0a0a0e"); p.ell(wx, 47, 2.7, 2.7, "#101014"); p.ell(wx, 47, 1.6, 1.6, GOLD); p.p(wx, 47, "#101014"); }
  p.r(29, 43, 3, 1, f % 40 < 20 ? "#fff7c0" : "#ffe27a"); p.r(3, 44, 1, 1, "#ff3b3b"); p.r(3, 43, 1, 1, "#ff3b3b");
  if (f % 40 < 4) spark(p, 26 - (f % 40) * 3, 41, "#ffffff");

  // ---- terrace: gold balustrade, marble floor, infinity pool
  p.r(0, 51, 60, 1, GOLD); p.r(0, 52, 60, 1, GOLD2);
  for (let x = 1; x < 60; x += 3) { p.r(x, 53, 2, 5, "#e8dfc8"); p.r(x, 53, 1, 5, "#fffaf0"); }
  p.r(0, 58, 60, 1, GOLD); p.r(0, 59, 60, 1, GOLD2);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) p.r(c * 6, 60 + r * 3, 6, 3, (c + r) % 2 ? "#e4dac6" : "#f6f0e4");
  p.r(0, 72, 60, 1, GOLD); p.r(0, 73, 60, 1, GOLD2);
  p.r(0, 74, 60, 6, "#2aa8d0");
  for (let x = 0; x < 60; x++) {
    const w = Math.round(Math.sin(x * 0.5 + T * 20));
    p.p(x, 75 + w, "#7fe0f4"); p.p(x, 78 - w, "#1a8ab8");
    if ((x + Math.floor(f / 3)) % 8 === 0) p.p(x, 76, "#ffffff");
  }
  for (const sx of [3, 21, 41]) p.ell(sx + 8, 69.5, 7.5, 1.4, "rgba(70,45,20,0.35)");
  // little gold-bar stack between the cats
  p.r(18, 67, 4, 2, GOLD); p.r(18, 67, 4, 1, "#fff3b0"); p.r(19, 65, 2, 2, GOLD); p.r(19, 65, 2, 1, "#fff3b0");

  // ---- falling money (behind the cats)
  for (let k = 0; k < 10; k++) {
    const x = hs(k * 3.3) * 56 + Math.sin(T * 8 + k) * 2, y = ((hs(k + 7) * 100 + f * (k % 2 ? 1.25 : 2.5)) % 100) - 12;
    const w = Math.sin(T * 20 + k * 2) > 0 ? 4 : 3;
    p.r(x, y, w, 2, "#2a8f46"); p.r(x + 1, y, w - 2, 2, "#8cf0a0"); p.p(x + 1, y, "#2a8f46");
  }

  // ---- the three cats, all the same size: girl - boss - girl
  const by = 53, glint = (f % 40) - 6;
  const blink = (n: number): Eyes => (f % 60 > n && f % 60 < n + 3 ? "blink" : "happy");
  const GL = { a: "#fff6ee", b: "#ead4c4" }, GR = { a: "#d6d6ea", b: "#b0b0cc" };
  cat(p, 3, by - hopL, { eyes: blink(20), mouth: 1, blush: true, pal: { ...GL, L: "#ff2f6a", D: "#ff7eb6", E: "#e0529a", X: "#ff4f9a", P: "#ffffff" }, fix: (g) => girlFace(g, "D", "E") });
  cat(p, 41, by - hopR, { eyes: blink(44), mouth: 1, blush: true, flip: true, pal: { ...GR, L: "#ff2f6a", D: "#8a6bff", E: "#6a4bd8", X: "#b86bff", P: "#ffffff" }, fix: (g) => girlFace(g, "D", "E") });
  cat(p, 22, by, { eyes: "open", mouth: 0, blush: false, pal: { G: "#101a3c", j: "#3a5cc0", h: "#8ab0ff", H: "#ffffff", F: GOLD, T: "#16161e", U: "#26263a", W: "#ffffff" }, fix: (g) => richFace(g, glint >= 0 && glint < 12 ? glint : -1) });
  if (glint >= 3 && glint < 10) spark(p, 24 + glint, by + 5, "#ffffff");
  // boss paw raising a champagne flute
  const lift = Math.round(Math.sin(T * 20) * 1);
  p.r(36, by + 9, 3, 2, "#f59a3c"); p.r(36, by + 11, 3, 1, NAVY); p.r(38, by + 9, 1, 2, NAVY);
  const fx = 38, fy = by + 3 + lift;
  bm(p, fx, fy, ["X.X", "XYX", "XYX", ".X.", ".X."], { X: "#e8f4ff", Y: "#ffe27a" });
  for (let k = 0; k < 3; k++) { const a = (f + k * 4) % 12; p.p(fx + 1, fy + 2 - a * 0.3, a < 8 ? "#fff3b0" : "#ffffff"); }
  if (f % 40 > 32) spark(p, fx + 1, fy - 2, "#ffffff");

  // hearts drifting up from the girls
  for (let k = 0; k < 2; k++) {
    const a = (f + k * 15) % 30;
    bm(p, 9 + k * 40 + Math.round(Math.sin(a * 0.4) * 2), 50 - a * 0.25, [".X.X.", "XXXXX", ".XXX.", "..X.."], { X: a > 20 ? "#ffb4cc" : "#ff5f93" });
  }

  // ---- gold glitter over everything
  for (let k = 0; k < 7; k++) { const a = (f + k * 6) % 24; if (a < 3) spark(p, 4 + hs(k + 40) * 52, 36 + hs(k + 50) * 30, a === 1 ? "#ffffff" : "#ffe27a"); }
}

// ================================================================ SCENE 5: Surf Cat riding a snow dune under the aurora
type Pt2 = number;
function catSheared(p: Pen, x: number, y: number, s: number, lean: number, o: CatOpt): void {
  const pal: Record<string, string> = { o: NAVY, e: "#1b1b1b", p: "#ff8fa3", w: "#ffffff", m: "#6a1b2d", t: "#ff6f8e", k: "#ff8fa3", ...FUR, ...(o.pal ?? {}) };
  catGrid(o).forEach((row, j) => {
    const dx = Math.round((lean * (15 - j)) / 15) * s;
    row.forEach((ch, i) => { const c = pal[ch]; if (c) p.r(x + dx + i * s, y + j * s, s, s, c); });
  });
}
function cactus(p: Pen, x: number, gy: number, h: number, tint: string): void {
  const G = mix("#2d6a5a", tint, 0.18), L = mix("#4aa088", tint, 0.18);
  p.r(x, gy - h, 3, h, G); p.r(x, gy - h, 1, h, L);
  p.r(x - 3, gy - h * 0.6, 3, 2, G); p.r(x - 3, gy - h * 0.6 - 4, 2, 5, G);
  p.r(x + 3, gy - h * 0.8, 3, 2, G); p.r(x + 4, gy - h * 0.8 - 3, 2, 4, G);
  p.r(x - 1, gy - h - 1, 5, 2, "#ffffff"); p.r(x - 3, gy - h * 0.6 - 5, 2, 1, "#ffffff"); p.r(x + 4, gy - h * 0.8 - 4, 2, 1, "#ffffff"); p.r(x - 1, gy - 2, 5, 2, "#e8f2ff");
}

function surfCat(p: Pen, f: number): void {
  const sky = (y: number): string => mix("#04051a", "#1c3a78", Math.pow(y / 46, 1.4));
  for (let y = 0; y < 50; y++) p.r(0, y, 60, 1, sky(y));
  // stars
  for (let i = 0; i < 26; i++) {
    const sx = hs(i * 2.1) * 60, sy = hs(i * 3.7 + 1) * 34, tw = (f + i * 5) % 18;
    p.p(sx, sy, tw < 2 ? "#ffffff" : i % 3 === 0 ? "#c8d4ff" : "#7482c4");
    if (i % 7 === 0 && tw < 4) { p.p(sx - 1, sy, "#8a96d8"); p.p(sx + 1, sy, "#8a96d8"); p.p(sx, sy - 1, "#8a96d8"); p.p(sx, sy + 1, "#8a96d8"); }
  }
  { const a = (f + 20) % 70; if (a < 10) for (let j = 0; j < 6; j++) p.p(8 + a * 3.2 - j * 1.6, 5 + a * 1.1 - j * 0.55, j === 0 ? "#ffffff" : j < 3 ? "#bcd0ff" : "#5a70b8"); }
  // moon
  p.ell(49, 11, 8, 8, "#1e3a78"); p.ell(49, 11, 6, 6, "#c8d8ff"); p.ell(49, 11, 5, 5, "#f4f8ff");
  p.ell(51, 10, 4, 4, "#f4f8ff"); p.p(47, 12, "#c8d4ee"); p.p(48, 13, "#c8d4ee"); p.p(52, 9, "#d8e2f8"); p.p(50, 14, "#d0daf2");
  // aurora curtains
  for (let x = 0; x < 60; x++) {
    const base = 13 + 6 * Math.sin(x * 0.11 + f * 0.045) + 3 * Math.sin(x * 0.29 - f * 0.07);
    const hgt = 17 + 7 * Math.sin(x * 0.07 + f * 0.03 + 1.3) + 3 * Math.sin(x * 0.21 + f * 0.05);
    const ray = 0.45 + 0.55 * vnoise(x * 0.55, f * 0.06);
    for (let y = Math.round(base - hgt * 0.5); y < Math.round(base + hgt * 0.5); y++) {
      const t = (y - (base - hgt * 0.5)) / hgt;
      const fade = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const I = fade * ray;
      if (I < 0.18) continue;
      if (I < 0.5 && (x + y) % 2) continue;
      const hue = t < 0.35 ? mix("#d070ff", "#7a6bff", t / 0.35) : t < 0.6 ? mix("#7a6bff", "#3fe0d0", (t - 0.35) / 0.25) : mix("#3fe0d0", "#5dff9a", (t - 0.6) / 0.4);
      p.p(x, y, mix(sky(y), hue, Math.min(0.92, I * 1.15)));
    }
  }
  // distant ice mountains
  for (let x = 0; x < 60; x++) {
    const wx = x + f * 0.1;
    const h = 40 - (Math.abs(((wx * 0.5) % 18) - 9) * 1.15) - 3 * Math.sin(wx * 0.17);
    const y0 = Math.round(h);
    p.r(x, y0, 1, 52 - y0, "#26438a"); p.r(x, y0, 1, 2, "#d8e8ff"); p.p(x, y0 + 2, "#9ab8f0");
  }
  const tint = f % 90 < 45 ? "#5dffb0" : "#8ab8ff";
  const dune = (x: number, base: number, amp: number, sc: number, spd: number, ph: number): number => base + amp * Math.sin((x + f * spd) * sc + ph) + amp * 0.4 * Math.sin((x + f * spd) * sc * 2.3 + ph * 1.7);
  const paint = (hfn: (x: number) => number, lit: string, mid: string, shade: string, glow: number): void => {
    for (let x = 0; x < 60; x++) {
      const y0 = Math.round(hfn(x)), sl = (hfn(x + 2) - hfn(x - 2)) / 4;
      for (let y = y0; y < 80; y += 2) {
        const d = y - y0, k = Math.min(1, d / 26), lee = sl > 0.12 ? Math.max(0, 1 - d / 9) * 0.55 : 0;
        const q = Math.round(Math.min(1, k * 0.8 + lee) * 4) / 4;
        p.r(x, y, 1, 2, mix(mix(mid, tint, glow * (1 - k)), shade, q));
      }
      p.p(x, y0, lit); if (sl < -0.1) p.p(x, y0 + 1, mix(lit, mid, 0.45));
    }
  };
  paint((x) => dune(x, 47, 3, 0.1, 0.35, 0.5), "#8aa4e0", "#3c5090", "#2a3a78", 0.1);
  // cacti on the mid dunes
  const hm = (x: number): number => dune(x, 55, 2.4, 0.13, 0.9, 2);
  paint(hm, "#c0d4ff", "#5a74b8", "#3f5499", 0.12);
  for (let i = 0; i < 3; i++) { const wx = ((i * 41 + 14 - f * 0.9) % 123 + 123) % 123 - 16; if (wx > -6 && wx < 62) cactus(p, Math.round(wx), Math.round(hm(wx + 1)) + 1, 10 + (i % 2) * 3, tint); }
  // near dune the cat rides
  const hn = (x: number): number => 66 + 2.2 * Math.sin((x + f * 2) * 0.09) + 0.9 * Math.sin((x + f * 2) * 0.23 + 1);
  const cx = 30, yb = hn(cx) - 1, slope = Math.max(-0.2, Math.min(0.2, ((hn(cx + 6) - hn(cx - 6)) / 12) * 0.8));
  paint(hn, "#ffffff", "#dce8ff", "#a8c0f0", 0.14);
  for (let k = 0; k < 14; k++) { const gx = (hs(k + 11) * 60 + 600 - f * 2) % 60, gy = 68 + hs(k + 31) * 11; if ((f + k * 3) % 8 < 2) p.p(gx, gy, "#ffffff"); else if (k % 3 === 0) p.p(gx, gy, "#b4ccf8"); }
  // speed lines
  for (let k = 0; k < 3; k++) { const sx = 60 - ((f * 3.4 + k * 25) % 84), sy = 45 + k * 6 + hs(Math.floor((f * 3.4 + k * 25) / 84) + k) * 3; if (sx > -8) p.r(sx, sy, 7, 1, "#9ab4ea"); }

  // ---- the surfer
  const bx0 = cx - 19, bx1 = cx + 19, by0 = yb - 19 * slope, by1 = yb + 19 * slope;
  const lean = slope > 0.08 ? 1 : slope < -0.08 ? -1 : 0;
  const ty = Math.round(yb) - 33;
  const scarfW = Math.sin(f * 0.5);
  // scarf tail flowing behind
  for (let i = 0; i < 9; i++) { const sx = cx - 6 - i * 1.6, sy = ty + 21 + Math.sin(f * 0.5 - i * 0.7) * 2 + i * 0.3; p.r(sx, sy, 2, 3, i % 3 === 0 ? "#ffffff" : "#ff4f6a"); p.r(sx, sy + 3, 2, 1, NAVY); }
  // board
  p.thick(bx0, by0, bx1, by1, 3, "#22d3c4", NAVY);
  p.line(bx0 + 2, by0, bx1 - 2, by1, "#ffd23f", 1); p.p(bx1, by1 - 1, "#ffffff");
  p.p(bx1 + 1, by1 - 2, NAVY); p.p(bx1 + 2, by1 - 3, NAVY);
  // arms (balance) behind the body
  const wv = Math.round(Math.sin(f * 0.35) * 2);
  p.thick(cx - 9, ty + 24, cx - 20, ty + 17 + wv, 3, "#f59a3c", NAVY); p.r(cx - 23, ty + 15 + wv, 4, 4, "#8ad0ff"); p.r(cx - 22, ty + 16 + wv, 2, 2, "#ffffff");
  p.thick(cx + 9, ty + 24, cx + 20, ty + 19 - wv, 3, "#f59a3c", NAVY); p.r(cx + 20, ty + 17 - wv, 4, 4, "#8ad0ff"); p.r(cx + 21, ty + 18 - wv, 2, 2, "#ffffff");
  const eyes: Eyes = f % 40 > 36 ? "blink" : "happy";
  catSheared(p, cx - 16, ty, 2, lean, { eyes, mouth: 2, blush: true });
  // scarf wrap + knot
  p.r(cx - 12 + lean * 2, ty + 18, 24, 3, "#ff4f6a"); p.r(cx - 12 + lean * 2, ty + 18, 24, 1, "#ff8aa0"); p.r(cx - 12 + lean * 2, ty + 21, 24, 1, NAVY);
  p.r(cx + 8 + lean * 2, ty + 21, 4, 5 + Math.round(scarfW), "#ff4f6a"); p.r(cx + 8 + lean * 2, ty + 21, 1, 5, "#ffffff");
  // snow spray from the tail of the board
  for (let k = 0; k < 16; k++) {
    const a = (f * 1.2 + k * 1.9) % 16, sx = bx0 - a * 1.5 - hs(k) * 2, sy = by0 - 1 - Math.sin((a / 16) * Math.PI) * 5 + a * 0.15;
    p.p(sx, sy, a < 6 ? "#ffffff" : a < 11 ? "#dce8ff" : "#9ab4ea"); if (k % 4 === 0 && a < 8) p.p(sx, sy - 1, "#ffffff");
  }
  // sparkles
  if (f % 20 < 3) spark(p, 12, 30, "#ffffff"); if ((f + 9) % 26 < 3) spark(p, 52, 38, "#c8f0ff");
}

// ================================================================ public API
const DRAW: Record<string, (p: Pen, f: number) => void> = { donut_cafe: donutScene, moon_walk: moonWalk, blossom_pair: blossomPair, crazy_rich: crazyRich, surf_cat: surfCat };
export const SCENE_LOOP: Record<string, number> = { donut_cafe: 48, moon_walk: 150, blossom_pair: 200, crazy_rich: 240, surf_cat: 200 };
/** Frame shown when animation is off (reduced motion). */
export const SCENE_POSTER: Record<string, number> = { donut_cafe: 20, moon_walk: 12, blossom_pair: 12, crazy_rich: 8, surf_cat: 14 };

export function drawScene(id: string, ctx: Ctx, frame: number, silhouette = false): void {
  const p = new Pen(ctx);
  const fn = DRAW[id];
  if (silhouette || !fn) { p.r(0, 0, SCENE_W, SCENE_H, "#3a2f4d"); return; }
  fn(p, frame);
}
