"use client";
import { useEffect, useRef } from "react";

// Notifikasi hijau di atas layar (sama seperti "Bio berhasil disimpan!"): hilang sendiri setelah 3 detik.
export default function Toast({ text, onDone, ms = 3000 }: { text: string; onDone: () => void; ms?: number }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { if (!text) return; const t = setTimeout(() => done.current(), ms); return () => clearTimeout(t); }, [text, ms]);
  return text ? <div className="toast-ok" role="status" aria-live="polite">✔ {text}</div> : null;
}
