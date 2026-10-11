"use client";
import { useEffect, useRef } from "react";
import { drawPackScene, PACK_W, PACK_H, PACK_SCALE } from "@/lib/packArt";

// Gambar statis kemasan (termasuk judul MEOWVERSE CARD berfont pixel): kucing pixel semua tier bermain di taman (pohon, gunung, awan, pelangi).
export default function PackScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) drawPackScene(ctx); }, []);
  return <canvas ref={ref} className="pk-scene" width={PACK_W * PACK_SCALE} height={PACK_H * PACK_SCALE} role="img" aria-label="MEOWVERSE CARD" />;
}
