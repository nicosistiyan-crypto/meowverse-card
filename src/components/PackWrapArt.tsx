"use client";
import { useEffect, useRef } from "react";
import { WRAP_W, WRAP_H, WRAP_SCALE, BOX_CW, BOX_CH, BOX_SCALE, drawPackWrapper, drawPackBox, packKind } from "@/lib/packBanner";
import type { TierKey } from "@/lib/types";

// Kemasan di animasi buka pack: desain sama dengan gambar pack di menu PACK (Pack 1 / 2 = foil perak, Collector = kemasan mewah).
export default function PackWrapArt({ name, tiers }: { name: string; tiers: TierKey[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = tiers.join(",");
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) drawPackWrapper(ctx, packKind(name), tiers); }, [name, key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="pk-scene" width={WRAP_W * WRAP_SCALE} height={WRAP_H * WRAP_SCALE} role="img" aria-label={name} />;
}

// Box pack untuk animasi Mv Pack 3. `part` = bagian yang tampak: tutup (atas) atau badan (bawah); keduanya digambar dari kanvas yang sama.
export function PackBoxArt({ part }: { part: "lid" | "body" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) drawPackBox(ctx); }, []);
  return <canvas ref={ref} className={"bx-cv " + part} width={BOX_CW * BOX_SCALE} height={BOX_CH * BOX_SCALE} aria-hidden="true" />;
}
