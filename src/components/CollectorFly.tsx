"use client";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

// COLLECTOR only: the card streaks in from off-screen along a curved path, glowing gold, with a trail of gold sparks
// left behind it, and lands in its normal spot (above the OK button). `onLand` fires the moment it lands.
export const COLLECTOR_FLY_MS = 1700;

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; col: string; star: boolean };
type Pt = { x: number; y: number };
const GOLD = ["#fff3b0", "#ffd23f", "#ffb300", "#ffffff", "#ffe066"];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function CollectorFly({ children, onLand }: { children: ReactNode; onLand: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const land = useRef(onLand);
  land.current = onLand;

  // first frame: hide the card before the browser paints, so it never flashes at its landing spot
  useLayoutEffect(() => { if (wrap.current) wrap.current.style.opacity = "0"; }, []);

  useEffect(() => {
    const el = wrap.current, canvas = cv.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // reduced motion: no flight, the card just waits and lands on time (keeps the sound in sync)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      const to = setTimeout(() => land.current(), COLLECTOR_FLY_MS);
      return () => clearTimeout(to);
    }

    const size = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    size();
    window.addEventListener("resize", size);

    el.style.transform = "";
    const home = el.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const cx0 = home.left + home.width / 2 - cr.left, cy0 = home.top + home.height / 2 - cr.top;
    const W = canvas.width, H = canvas.height;
    // cubic bezier: from off-screen top-left, a wide swoop to the right, back across, then down into place
    const P0: Pt = { x: -180, y: -220 }, P1: Pt = { x: W * 1.0, y: H * 0.02 }, P2: Pt = { x: W * 0.0, y: H * 0.62 }, P3: Pt = { x: cx0, y: cy0 };
    const bez = (u: number): Pt => {
      const m = 1 - u, a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
      return { x: a * P0.x + b * P1.x + c * P2.x + d * P3.x, y: a * P0.y + b * P1.y + c * P2.y + d * P3.y };
    };

    const sparks: Spark[] = [];
    const trail: Pt[] = [];
    let ring = -1, landed = false, raf = 0, prev: Pt = P0;
    const start = performance.now();
    let last = start;
    el.classList.add("fly");

    const add = (x: number, y: number, vx: number, vy: number, big = false) => {
      const max = rnd(0.45, big ? 1.3 : 0.95);
      sparks.push({ x, y, vx, vy, life: max, max, size: Math.round(rnd(3, big ? 9 : 7)), col: GOLD[(Math.random() * GOLD.length) | 0], star: Math.random() < 0.28 });
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = Math.min(1, (now - start) / COLLECTOR_FLY_MS);

      if (!landed) {
        const e = 1 - Math.pow(1 - t, 2.4);                       // fast at the start, slows down as it arrives
        const p = bez(e);
        const rot = -Math.pow(1 - e, 2) * 420;
        const sc = 0.4 + 0.6 * e + 0.14 * Math.sin(Math.PI * e);
        el.style.transform = `translate(${p.x - cx0}px,${p.y - cy0}px) rotate(${rot}deg) scale(${sc})`;
        el.style.opacity = String(Math.min(1, t * 10));
        // sparks are left behind in screen space: the faster the card moves, the more it sheds
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
        const n = Math.min(16, Math.ceil(dist / 4));
        for (let i = 0; i < n; i++) {
          const k = Math.random();
          add(prev.x + (p.x - prev.x) * k + rnd(-42, 42), prev.y + (p.y - prev.y) * k + rnd(-52, 52), rnd(-45, 45), rnd(-60, 30));
        }
        trail.push(p);
        if (trail.length > 18) trail.shift();
        prev = p;
        if (t >= 1) {                                               // landed: gold burst + shockwave
          landed = true;
          for (let i = 0; i < 56; i++) { const a = rnd(0, Math.PI * 2), s = rnd(90, 360); add(cx0, cy0, Math.cos(a) * s, Math.sin(a) * s - 60, true); }
          ring = 0;
          el.style.transform = ""; el.style.opacity = "1";
          el.classList.remove("fly"); el.classList.add("land");
          land.current();
        }
      } else if (trail.length) trail.shift();

      // ---- draw (additive, so overlapping sparks glow)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      if (!landed && trail.length) {
        const h = trail[trail.length - 1];
        const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 150);
        g.addColorStop(0, "rgba(255,210,63,.5)"); g.addColorStop(1, "rgba(255,179,0,0)");
        ctx.fillStyle = g; ctx.fillRect(h.x - 150, h.y - 150, 300, 300);
      }
      if (trail.length > 1) {
        ctx.lineCap = "round";
        for (let i = 1; i < trail.length; i++) {
          const f = i / trail.length;
          ctx.strokeStyle = `rgba(255,${Math.round(170 + 60 * f)},${Math.round(40 + 60 * f)},${0.55 * f})`;
          ctx.lineWidth = 4 + 30 * f;
          ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.vy += 170 * dt; s.vx *= 0.985; s.x += s.vx * dt; s.y += s.vy * dt;
        const a = s.life / s.max, z = Math.max(2, Math.round(s.size * (0.4 + 0.6 * a)));
        ctx.globalAlpha = Math.min(1, a * 1.4);
        ctx.fillStyle = s.col;
        const x = Math.round(s.x), y = Math.round(s.y);
        if (s.star) { ctx.fillRect(x - z, y, z * 3, z); ctx.fillRect(x, y - z, z, z * 3); } else ctx.fillRect(x, y, z, z);
      }
      ctx.globalAlpha = 1;
      if (ring >= 0) {
        ring += dt;
        const r = 40 + ring * 520, a = Math.max(0, 1 - ring / 0.7);
        ctx.strokeStyle = `rgba(255,224,102,${a})`; ctx.lineWidth = 6 * a + 1;
        ctx.beginPath(); ctx.arc(cx0, cy0, r, 0, Math.PI * 2); ctx.stroke();
        if (ring > 0.7) ring = -1;
      }
      ctx.globalCompositeOperation = "source-over";

      if (!landed || sparks.length || trail.length || ring >= 0) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }, []);

  return (
    <>
      <canvas ref={cv} className="cofx" />
      <div ref={wrap} className="cwrap cofly">{children}</div>
    </>
  );
}
