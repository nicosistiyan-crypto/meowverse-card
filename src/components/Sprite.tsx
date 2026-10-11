"use client";
import { useEffect, useRef } from "react";
import { ANIM_FRAMES, drawSprite } from "@/lib/sprite";
import type { SpriteData } from "@/lib/types";
import SceneCanvas from "./SceneCanvas";

function PixelSprite({ data, sil }: { data: SpriteData; sil: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) drawSprite(ref.current, data.pal, data.ov, sil); }, [data, sil]);
  return <canvas ref={ref} width={16} height={16} />;
}

// ---- animated sprite (ABSOLUTE): blinks and nods. One shared 10 fps clock; only cards that are on screen are redrawn.
type Item = { cv: HTMLCanvasElement; data: SpriteData; visible: boolean; phase: number };
const items = new Set<Item>();
let timer: ReturnType<typeof setInterval> | null = null;
let frame = 0;
const paint = (it: Item) => drawSprite(it.cv, it.data.pal, it.data.ov, false, frame + it.phase);
function tick() {
  if (document.hidden) return;
  frame = (frame + 1) % ANIM_FRAMES;
  items.forEach((it) => { if (it.visible) paint(it); });
}

function AnimSprite({ data }: { data: SpriteData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { drawSprite(cv, data.pal, data.ov, false); return; }
    // every card starts at a different point of the loop, so a row of cards does not nod in unison
    const it: Item = { cv, data, visible: true, phase: Math.floor(Math.random() * ANIM_FRAMES) };
    paint(it);
    const io = new IntersectionObserver(([e]) => { it.visible = e.isIntersecting; if (e.isIntersecting) paint(it); });
    io.observe(cv);
    items.add(it);
    if (!timer) timer = setInterval(tick, 100);
    return () => {
      io.disconnect(); items.delete(it);
      if (!items.size && timer) { clearInterval(timer); timer = null; }
    };
  }, [data]);
  return <canvas ref={ref} width={16} height={16} />;
}

// Normal cards are a static 16x16 sprite; ABSOLUTE cards (anim) blink and nod; COLLECTOR cards carry a `scene` id and play an animated pixel scene.
export default function Sprite({ data, sil = false }: { data: SpriteData; sil?: boolean }) {
  if (data.scene) return <SceneCanvas id={data.scene} sil={sil} />;
  return data.anim && !sil ? <AnimSprite data={data} /> : <PixelSprite data={data} sil={sil} />;
}
