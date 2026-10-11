// Gambar pixel art statis untuk kemasan pack (96x128 piksel logis, rasio 3:4 sama seperti kemasan).
// Tidak ada animasi: digambar sekali ke canvas.
export const PACK_W = 96;
export const PACK_H = 128;
export const PACK_SCALE = 2; // canvas 2x lebih rapat supaya judul bisa digambar lebih halus; adegan tetap piksel besar

const PL: Record<string, string> = { o: "#2a1b33", e: "#1b1b1b", p: "#ff8fa3", w: "#ffffff", y: "#ffd23f" };
const BASE = ["................", "..oo........oo..", ".oaao......oaao.", ".oaaoooooooaaao.", ".oaaaaaaaaaaaao.", ".oaaeaaaaaaeaao.", ".oaaeaaaaaaeaao.", ".oaaaaapppaaaao.", "..oaaaaaaaaaao..", "...oooooooooo...", "..oaaaaaaaaaao..", ".oaaaaaaaaaaaao.", ".oaabaabbaabaao.", ".oaaaaaaaaaaaao.", ".owwoaaaaaaowwo.", ".oooo......oooo."];

type Cat = { pal: Record<string, string>; ov: [number, number, string][] };
// Wakil tiap tier, memakai palet yang sama dengan kartu di game.
const CATS: Cat[] = [
  { pal: { a: "#f59a3c", b: "#d9731f" }, ov: [] },                                                                                             // C  Orange Cat
  { pal: { a: "#4a4a5a", b: "#33333f", d: "#d32f2f" }, ov: [[2, 4, "dddddddddddd"], [14, 4, "dd"], [15, 5, "d"]] },                            // B  Ninja Cat
  { pal: { a: "#66bb6a", b: "#388e3c", c: "#ef5350" }, ov: [[0, 7, "c"], [0, 8, "cc"], [0, 9, "ccc"], [0, 10, "c"], [15, 7, "c"], [14, 8, "cc"], [13, 9, "ccc"], [15, 10, "c"]] }, // A Dragon Cat
  { pal: { a: "#3949ab", b: "#283593" }, ov: [[4, 11, "y"], [9, 13, "w"], [11, 12, "y"], [6, 12, "w"], [3, 13, "w"], [4, 3, "y"]] },             // S  Galaxy Cat
  { pal: { a: "#ffca28", b: "#f9a825", c: "#ff1744" }, ov: [[5, 2, "c.cc.c"], [5, 3, "cccccc"], [7, 1, "y"]] },                                // S+ King of Cats
  { pal: { a: "#f8bbd0", b: "#f06292", c: "#ad1457", d: "#ffffff" }, ov: [[2, 9, "cccccccccccc"], [2, 10, "cccccccccccc"], [2, 11, "cccccccccccc"], [2, 12, "cccccccccccc"], [4, 0, "d"], [11, 0, "d"], [7, 1, "d"], [0, 6, "d"], [15, 6, "d"], [7, 10, "d"], [7, 12, "d"]] }, // PRIME
  { pal: { a: "#d32f2f", b: "#8e0000", c: "#ffd23f", d: "#ff6f00" }, ov: [[5, 2, "c.cc.c"], [5, 3, "cccccc"], [0, 6, "d"], [0, 7, "d"], [1, 8, "d"], [15, 6, "d"], [15, 7, "d"], [14, 8, "d"], [0, 12, "d"], [15, 12, "d"], [2, 4, "cccccccccccc"]] }, // ABSOLUTE
  { pal: { a: "#ffe27a", b: "#ffc400", r: "#ff4081", g: "#4cd964", u: "#40c4ff", v: "#b266ff" }, ov: [[4, 0, "ryguvyrg"], [0, 3, "u"], [15, 3, "r"], [1, 9, "v"], [14, 9, "g"]] }, // COLLECTOR (emas + halo pelangi)
];

function drawScene(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  const R = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---- langit (pita warna + dither di tiap batas) ----
  const SKY = ["#3d8fe8", "#4a9cf0", "#57a8f5", "#66b4f8", "#78bff9", "#8ccaf9", "#a0d5fa", "#b4dffb", "#c8e8fc", "#daf1fd", "#eaf7fe", "#f6fbff"];
  const bandH = 7;
  for (let y = 0; y < 90; y++) {
    const b = Math.min(SKY.length - 1, Math.floor(y / bandH));
    const nxt = Math.min(SKY.length - 1, b + 1);
    const edge = y % bandH >= bandH - 2;
    for (let x = 0; x < PACK_W; x++) R(x, y, 1, 1, edge && (x + y) % 2 === 0 ? SKY[nxt] : SKY[b]);
  }

  // ---- matahari ----
  const sx = 80, sy = 13;
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
    const d = Math.hypot(x, y);
    if (d <= 5.2) R(sx + x, sy + y, 1, 1, d > 4 ? "#ffd23f" : "#fff6a8");
  }
  [[0, -9], [0, 9], [-9, 0], [9, 0], [-7, -7], [7, 7], [-7, 7], [7, -7]].forEach(([dx, dy]) => R(sx + dx, sy + dy, 2, 2, "#ffe36e"));

  // ---- pelangi (di belakang gunung) ----
  const RB = ["#ff3b3b", "#ff9a2e", "#ffe14a", "#4ccf5a", "#3b8cff", "#5b4de0", "#a64de0"];
  const rcx = 48, rcy = 112, rOut = 54;
  for (let y = 0; y < 100; y++) for (let x = 0; x < PACK_W; x++) {
    const d = Math.hypot(x + 0.5 - rcx, y + 0.5 - rcy);
    if (d <= rOut && d > rOut - 14) R(x, y, 1, 1, RB[Math.min(6, Math.floor((rOut - d) / 2))]);
  }

  // ---- awan ----
  const cloud = (x: number, y: number, w: number) => {
    R(x + 2, y + 3, w - 4, 3, "#ffffff"); R(x, y + 4, w, 2, "#ffffff");
    R(x + 3, y + 1, Math.floor(w / 3), 3, "#ffffff"); R(x + Math.floor(w / 2), y, Math.floor(w / 3), 4, "#ffffff");
    R(x + 1, y + 6, w - 2, 1, "#cfe6fb"); R(x + 3, y + 5, 2, 1, "#e9f4ff");
  };
  cloud(4, 6, 22); cloud(52, 3, 18); cloud(26, 13, 14);          // di atas / area sobekan
  cloud(1, 62, 18); cloud(76, 58, 20); cloud(34, 68, 12);        // di sisi pelangi

  // ---- gunung (jauh) dengan puncak bersalju ----
  const mountain = (cx: number, top: number, base: number, slope: number, c1: string, c2: string, snow: number) => {
    for (let y = top; y < base; y++) {
      const hw = Math.floor((y - top) * slope) + 1;
      for (let x = cx - hw; x <= cx + hw; x++) {
        if (x < 0 || x >= PACK_W) continue;
        const depth = snow + ((x * 7 + y) % 3) - (x > cx ? 1 : 0);
        let c = x > cx + ((y * 5) % 4) - 1 ? c2 : c1;
        if (y - top < depth) c = x > cx ? "#d7e2ff" : "#ffffff";
        R(x, y, 1, 1, c);
      }
    }
  };
  mountain(48, 74, 92, 1.3, "#9aaee0", "#7f93cf", 4);
  mountain(15, 60, 92, 1.05, "#8b9fd8", "#6f81bf", 7);
  mountain(81, 55, 92, 1.0, "#8b9fd8", "#6f81bf", 8);

  // ---- bukit hijau ----
  for (let x = 0; x < PACK_W; x++) {
    const h = 85 + Math.round(2 * Math.sin(x / 9) + 1.5 * Math.sin(x / 4.3));
    R(x, h, 1, 8, "#4f9a4a"); R(x, h, 1, 1, "#69b65b");
  }

  // ---- barisan pohon di kejauhan ----
  const pine = (x: number, top: number, h: number, c: string, c2: string) => {
    for (let i = 0; i < h; i++) { const w = Math.min(7, 1 + i); const l = x - Math.floor(w / 2); R(l, top + i, w, 1, i % 3 === 2 ? c2 : c); }
    R(x, top + h, 1, 2, "#5a3b22");
  };
  for (let x = 20; x < 78; x += 5) { const h = 7 + Math.floor(rnd() * 4); pine(x + Math.floor(rnd() * 2), 91 - h, h, "#2f7a3a", "#276b33"); }

  // ---- padang rumput ----
  for (let y = 91; y < PACK_H; y++) {
    const band = Math.floor((y - 91) / 4) % 2;
    R(0, y, PACK_W, 1, band ? "#6cc956" : "#78d65f");
  }
  for (let i = 0; i < 46; i++) { // rumput kecil
    const x = Math.floor(rnd() * 94), y = 93 + Math.floor(rnd() * 34);
    R(x, y, 1, 2, "#4fae45"); R(x + 2, y + 1, 1, 1, "#4fae45"); R(x + 1, y + 1, 1, 1, "#4fae45");
  }
  const FL = ["#ffffff", "#ff6b9d", "#c58bff", "#ffffff", "#ffb347"];
  for (let i = 0; i < 20; i++) { // bunga
    const x = 2 + Math.floor(rnd() * 90), y = 95 + Math.floor(rnd() * 30), c = FL[i % FL.length];
    R(x, y - 1, 1, 1, c); R(x - 1, y, 1, 1, c); R(x + 1, y, 1, 1, c); R(x, y + 1, 1, 1, c); R(x, y, 1, 1, "#ffd23f");
  }

  // ---- pohon besar kiri & kanan ----
  const tree = (cx: number, cy: number, r: number, trunkTop: number, trunkX: number) => {
    R(trunkX, trunkTop, 4, 106 - trunkTop, "#7a4a24"); R(trunkX + 3, trunkTop, 1, 106 - trunkTop, "#5a3418"); R(trunkX - 1, 104, 6, 2, "#5a3418");
    for (let y = -r; y <= r; y++) for (let x = -r - 2; x <= r + 2; x++) {
      const d = Math.hypot(x / 1.15, y);
      if (d > r) continue;
      let c = "#2e8b3d";
      if (d > r - 2.5 && x + y > 1) c = "#1f6b2e";
      else if (x + y < -r * 0.5) c = "#58c05a";
      else if ((x * 3 + y * 5) % 11 === 0) c = "#46a84b";
      R(cx + x, cy + y, 1, 1, c);
    }
    R(cx - 3, cy - r + 2, 3, 1, "#8bdc78"); R(cx - r + 2, cy - 2, 2, 1, "#8bdc78");
  };
  tree(9, 78, 11, 86, 7);
  tree(88, 82, 10, 90, 86);

  // ---- kucing ----
  const drawCat = (cat: Cat, x0: number, y0: number, flip: boolean) => {
    const g = BASE.map((r) => r.split(""));
    cat.ov.forEach(([x, y, row]) => [...row].forEach((ch, k) => { if (ch !== "." && g[y] && x + k < 16) g[y][x + k] = ch; }));
    R(x0 + 1, y0 + 15, 14, 2, "#4c9f43");           // bayangan
    g.forEach((row, y) => row.forEach((ch, x) => {
      if (ch === ".") return;
      R(x0 + (flip ? 15 - x : x), y0 + y, 1, 1, cat.pal[ch] || PL[ch]);
    }));
  };
  // baris belakang (4) lalu baris depan (4); satu kucing sedang melompat
  const back = [[15, 93, 0, false], [33, 91, 1, true], [51, 93, 2, false], [69, 92, 3, true]] as const;
  const front = [[6, 108, 4, false], [28, 106, 5, true], [50, 109, 6, false], [72, 108, 7, true]] as const;
  [...back, ...front].forEach(([x, y, i, f]) => drawCat(CATS[i], x, y, f));

  // ---- mainan & kupu-kupu ----
  const ball = (x: number, y: number, c: string) => { R(x + 1, y, 2, 1, c); R(x, y + 1, 4, 2, c); R(x + 1, y + 3, 2, 1, c); R(x + 1, y + 1, 1, 1, "#ffffff"); };
  ball(22, 121, "#ff4d6d"); ball(46, 118, "#40c4ff"); ball(68, 122, "#ffe14a");
  const fly = (x: number, y: number, c: string) => { R(x, y, 2, 2, c); R(x + 3, y, 2, 2, c); R(x + 2, y + 1, 1, 2, "#2a1b33"); R(x, y, 1, 1, "#ffffff"); R(x + 4, y, 1, 1, "#ffffff"); };
  fly(40, 86, "#ff8fd0"); fly(63, 98, "#ffe14a"); fly(11, 106, "#8be0ff");
}

// ---- judul "MEOWVERSE CARD": font bitmap 5x7 digambar langsung ke canvas (selalu pixel, tidak bergantung font web) ----
const GLYPH: Record<string, string[]> = {
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
};
const mix = (hex: string, to: number, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * t));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
};

function drawWord(ctx: CanvasRenderingContext2D, word: string, colors: string[], y: number, sc: number) {
  const o = sc >= 4 ? 2 : 1;                                    // tebal outline hitam (tipis supaya lubang huruf tetap terbuka)
  const gap = sc + o, w = 5 * sc, total = word.length * w + (word.length - 1) * gap;
  const x0 = Math.round((PACK_W * PACK_SCALE - total) / 2);
  const cells = (cb: (cx: number, cy: number, row: number) => void) => word.split("").forEach((ch, i) => {
    GLYPH[ch].forEach((line, row) => line.split("").forEach((bit, col) => { if (bit === "1") cb(x0 + i * (w + gap) + col * sc, y + row * sc, row * 100 + i); }));
  });
  ctx.fillStyle = "#000";
  const offs: [number, number][] = [];
  for (let dx = -o; dx <= o; dx++) for (let dy = -o; dy <= o; dy++) offs.push([dx, dy]);
  for (let dx = -o; dx <= o; dx++) offs.push([dx, o + 1]);        // bayangan 1 piksel di bawah
  cells((cx, cy) => offs.forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, sc, sc)));   // outline + bayangan bawah
  word.split("").forEach((ch, i) => {
    GLYPH[ch].forEach((line, row) => line.split("").forEach((bit, col) => {
      if (bit !== "1") return;
      const base = colors[i % colors.length];
      ctx.fillStyle = row === 0 ? mix(base, 255, 0.4) : row >= 5 ? mix(base, 0, 0.22) : base;  // sorot atas, bayangan bawah
      ctx.fillRect(x0 + i * (w + gap) + col * sc, y + row * sc, sc, sc);
    }));
  });
}

export function drawPackScene(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.scale(PACK_SCALE, PACK_SCALE); drawScene(ctx); ctx.restore();
  drawWord(ctx, "MEOWVERSE", ["#ff4d6d", "#ff9f1c", "#ffe14a", "#4ccf5a", "#3bc9ff", "#7a6bff", "#d65bff", "#ff6bb5", "#ff4d6d"], 54, 3);
  drawWord(ctx, "CARD", ["#ffe14a", "#4ccf5a", "#3bc9ff", "#ff6bb5"], 86, 4);
}
