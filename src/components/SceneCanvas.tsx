"use client";
import { useEffect, useRef } from "react";
import { drawScene, SCENE_W, SCENE_H, SCENE_FPS, SCENE_POSTER } from "@/lib/scenes";

type Item = { cv: HTMLCanvasElement; id: string; visible: boolean };
const items = new Set<Item>();
let timer: ReturnType<typeof setInterval> | null = null;
let frame = 0;

function paint(it: Item) {
  const ctx = it.cv.getContext("2d");
  if (ctx) drawScene(it.id, ctx, frame % 2400);
}
// One shared clock for every scene on the page; only canvases that are on screen get redrawn.
function tick() {
  if (document.hidden) return;
  frame++;
  items.forEach((it) => { if (it.visible) paint(it); });
}

export default function SceneCanvas({ id, sil = false }: { id: string; sil?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = sil || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) { drawScene(id, ctx, SCENE_POSTER[id] ?? 0, sil); return; }
    const it: Item = { cv, id, visible: true };
    paint(it);
    const io = new IntersectionObserver(([e]) => { it.visible = e.isIntersecting; if (e.isIntersecting) paint(it); });
    io.observe(cv);
    items.add(it);
    if (!timer) timer = setInterval(tick, 1000 / SCENE_FPS);
    return () => {
      io.disconnect(); items.delete(it);
      if (!items.size && timer) { clearInterval(timer); timer = null; }
    };
  }, [id, sil]);
  return <canvas ref={ref} className="scene" width={SCENE_W} height={SCENE_H} />;
}
