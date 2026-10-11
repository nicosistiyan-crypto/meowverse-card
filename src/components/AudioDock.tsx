"use client";
import { useEffect, useState } from "react";
import { audio } from "@/lib/audio";

// Two small switches (music / sound effects) and the click-to-unlock hook: browsers only allow sound after a click or tap,
// so the background music starts on the first interaction anywhere in the game. Choices are remembered.
export default function AudioDock() {
  const [p, setP] = useState({ music: true, sfx: true });
  useEffect(() => {
    setP({ ...audio.prefs });
    const off = audio.subscribe(() => setP({ ...audio.prefs }));
    const go = () => audio.unlock();
    audio.unlock();   // after a page reload, try to resume the music right away (it starts at once if the browser allows it, otherwise on the first click)
    const ev = ["pointerdown", "keydown", "touchstart"] as const;
    ev.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return () => { off(); ev.forEach((e) => window.removeEventListener(e, go)); };
  }, []);
  return (
    <div className="adock">
      <button className={p.music ? "" : "off"} aria-pressed={p.music} title="Musik latar" onClick={() => audio.setMusic(!p.music)}>♪ BGM</button>
      <button className={p.sfx ? "" : "off"} aria-pressed={p.sfx} title="Efek suara" onClick={() => audio.setSfx(!p.sfx)}>♫ SFX</button>
    </div>
  );
}
