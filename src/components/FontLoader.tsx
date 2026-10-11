"use client";
import { useEffect } from "react";

// The pixel fonts come from Google Fonts. A normal <link> in <head> BLOCKS rendering until it finishes, so a slow or
// blocked connection makes every page (and `npm run dev`) look like it hangs. Loading it after the page is drawn
// keeps the app instant; the fallback monospace font is shown for a moment and then swaps.
export default function FontLoader() {
  useEffect(() => {
    if (document.getElementById("pc-fonts")) return;
    const l = document.createElement("link");
    l.id = "pc-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
}
