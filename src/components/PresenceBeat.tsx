"use client";
import { useEffect } from "react";

// Tidak menampilkan apa-apa. Selama web terbuka (tab terlihat) mengirim ping tiap 45 detik, jadi pemain tampil online (bulatan hijau).
export default function PresenceBeat() {
  useEffect(() => {
    const ping = () => { if (!document.hidden) fetch("/api/presence", { method: "POST", cache: "no-store", keepalive: true }).catch(() => {}); };
    ping();
    const id = setInterval(ping, 45000);
    document.addEventListener("visibilitychange", ping);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", ping); };
  }, []);
  return null;
}
