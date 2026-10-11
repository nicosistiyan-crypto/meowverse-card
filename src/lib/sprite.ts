const PL: Record<string, string> = { o: "#2a1b33", e: "#1b1b1b", p: "#ff8fa3", w: "#ffffff", y: "#ffd23f" };
const BASE = ["................","..oo........oo..",".oaao......oaao.",".oaaoooooooaaao.",".oaaaaaaaaaaaao.",".oaaeaaaaaaeaao.",".oaaeaaaaaaeaao.",".oaaaaapppaaaao.","..oaaaaaaaaaao..","...oooooooooo...","..oaaaaaaaaaao..",".oaaaaaaaaaaaao.",".oaabaabbaabaao.",".oaaaaaaaaaaaao.",".owwoaaaaaaowwo.",".oooo......oooo."];

export function drawSprite(cv: HTMLCanvasElement, pal: Record<string, string>, ov: [number, number, string][], sil: boolean) {
  const g = BASE.map((r) => r.split(""));
  ov.forEach(([x, y, row]) => [...row].forEach((ch, k) => { if (ch !== "." && g[y] && x + k < 16) g[y][x + k] = ch; }));
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, 16, 16);
  g.forEach((r, y) => r.forEach((ch, x) => {
    if (ch === ".") return;
    ctx.fillStyle = sil ? "#3a2f4d" : pal[ch] || PL[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
}
