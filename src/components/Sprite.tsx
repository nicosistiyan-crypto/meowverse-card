"use client";
import { useEffect, useRef } from "react";
import { drawSprite } from "@/lib/sprite";
import type { SpriteData } from "@/lib/types";
import SceneCanvas from "./SceneCanvas";

function PixelSprite({ data, sil }: { data: SpriteData; sil: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) drawSprite(ref.current, data.pal, data.ov, sil); }, [data, sil]);
  return <canvas ref={ref} width={16} height={16} />;
}

// Normal cards are a 16x16 sprite; COLLECTOR cards carry a `scene` id and play an animated pixel scene.
export default function Sprite({ data, sil = false }: { data: SpriteData; sil?: boolean }) {
  return data.scene ? <SceneCanvas id={data.scene} sil={sil} /> : <PixelSprite data={data} sil={sil} />;
}
