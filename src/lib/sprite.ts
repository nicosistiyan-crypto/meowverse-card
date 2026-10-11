const PL: Record<string, string> = { o: "#2a1b33", e: "#1b1b1b", p: "#ff8fa3", w: "#ffffff", y: "#ffd23f" };
const BASE = ["................","..oo........oo..",".oaao......oaao.",".oaaoooooooaaao.",".oaaaaaaaaaaaao.",".oaaeaaaaaaeaao.",".oaaeaaaaaaeaao.",".oaaaaapppaaaao.","..oaaaaaaaaaao..","...oooooooooo...","..oaaaaaaaaaao..",".oaaaaaaaaaaaao.",".oaabaabbaabaao.",".oaaaaaaaaaaaao.",".owwoaaaaaaowwo.",".oooo......oooo."];

// Animated sprites (ABSOLUTE cards, sprite_data.anim = true): a 5 second loop at 10 frames per second.
//  - the head nods down twice (frames 12-13 and 15-16): rows 0-7 drop one pixel and the chin row is tucked away,
//    so costume parts drawn on the head (hair, hats, bands: y <= 7) move with it while the body stays still,
//  - the eyes blink twice (frames 30-32 and 44-46): half closed, closed, half closed.
export const ANIM_FRAMES = 50;
const NOD = new Set([12, 13, 15, 16]);
const BLINK: Record<number, number> = { 30: 1, 31: 2, 32: 1, 44: 1, 45: 2, 46: 1 };

function animate(g: string[][], frame: number) {
  const t = ((frame % ANIM_FRAMES) + ANIM_FRAMES) % ANIM_FRAMES;
  if (NOD.has(t)) {
    for (let r = 8; r >= 1; r--) g[r] = g[r - 1].slice();
    g[0] = Array(16).fill(".");
  }
  const b = BLINK[t] ?? 0;
  if (b) for (const x of [4, 11]) {
    const ys: number[] = [];
    for (let r = 4; r <= 8; r++) if (g[r][x] === "e") ys.push(r);
    if (ys.length) {
      g[ys[0]][x] = "a";                                   // upper half of the eye closes
      if (b === 2 && ys.length > 1) g[ys[ys.length - 1]][x] = "o";   // fully closed: a thin dark line
    }
  }
}

export function drawSprite(cv: HTMLCanvasElement, pal: Record<string, string>, ov: [number, number, string][], sil: boolean, frame?: number) {
  const g = BASE.map((r) => r.split(""));
  ov.forEach(([x, y, row]) => [...row].forEach((ch, k) => { if (ch !== "." && g[y] && x + k < 16) g[y][x + k] = ch; }));
  if (frame !== undefined && !sil) animate(g, frame);
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, 16, 16);
  g.forEach((r, y) => r.forEach((ch, x) => {
    if (ch === ".") return;
    ctx.fillStyle = sil ? "#3a2f4d" : pal[ch] || PL[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
}
