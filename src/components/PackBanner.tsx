"use client";
import { useEffect, useRef } from "react";
import { BANNER_W, BANNER_H, BANNER_SCALE, drawPackBanner, packKind } from "@/lib/packBanner";
import type { TierKey } from "@/lib/types";

// Gambar pixel art di atas tiap kartu pack (kemasan / box). Digambar sekali ke canvas, tanpa animasi.
export default function PackBanner({ name, tiers }: { name: string; tiers: TierKey[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = tiers.join(",");
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) drawPackBanner(ctx, packKind(name), tiers); }, [name, key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="pkbanner" width={BANNER_W * BANNER_SCALE} height={BANNER_H * BANNER_SCALE} role="img" aria-label={name} />;
}
