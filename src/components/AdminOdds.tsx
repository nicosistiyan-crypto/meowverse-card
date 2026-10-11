"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER, TIER_KEYS, FUSABLE } from "@/lib/types";

type Pack = { id: number; name: string; odds: Record<string, number> };

export default function AdminOdds({ packs, fusion, bonus }: { packs: Pack[]; fusion: Record<string, number>; bonus: { PRIME: number; ABSOLUTE: number } }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<number, Record<string, string>>>(
    Object.fromEntries(packs.map((p) => [p.id, Object.fromEntries(TIER_KEYS.map((t) => [t, String(p.odds[t] ?? 0)]))])));
  const [fus, setFus] = useState<Record<string, string>>(Object.fromEntries(FUSABLE.map((t) => [t, String(fusion[t] ?? 0)])));
  const [bon, setBon] = useState({ PRIME: String(bonus.PRIME), ABSOLUTE: String(bonus.ABSOLUTE) });
  const [msg, setMsg] = useState("");
  const num = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v) || 0]));
  const sum = (id: number) => Object.values(num(vals[id])).reduce((s, v) => s + v, 0);

  async function save(url: string, payload: unknown) {
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Tersimpan ✔ (" + new Date().toLocaleTimeString() + ")" : d.error ?? "Gagal menyimpan.");
    if (r.ok) router.refresh();
  }
  return (
    <>
      <h2>Peluang pack (%)</h2>
      {packs.map((p) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <h3>{p.name}</h3>
          <div className="oddsg">
            {TIER_KEYS.map((t) => (
              <label key={t}>{TIER[t].label}
                <input type="number" min={0} max={100} step="0.01" value={vals[p.id][t]}
                  onChange={(e) => setVals({ ...vals, [p.id]: { ...vals[p.id], [t]: e.target.value } })} />
              </label>
            ))}
          </div>
          <div className="row">
            <button onClick={() => save("/api/admin/packs", { packId: p.id, odds: num(vals[p.id]) })}>SIMPAN</button>
            <span className="msg">Total: {sum(p.id).toFixed(2)}% (harus 100)</span>
            {msg && <span className="msg" role="status">{msg}</span>}
          </div>
        </div>
      ))}
      <h2>Peluang naik tier saat fusi (%)</h2>
      <div className="oddsg">
        {FUSABLE.map((t) => (
          <label key={t}>{TIER[t].label}
            <input type="number" min={0} max={100} step="0.01" value={fus[t]} onChange={(e) => setFus({ ...fus, [t]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="row"><button onClick={() => save("/api/admin/fusion", num(fus))}>SIMPAN FUSI</button></div>
      <h2>Peluang jackpot fusi (%)</h2>
      <p className="msg">Berlaku di setiap fusi, apa pun tier kartu yang difusi.</p>
      <div className="oddsg">
        {(["PRIME", "ABSOLUTE"] as const).map((t) => (
          <label key={t}>{TIER[t].label}
            <input type="number" min={0} max={100} step="0.01" value={bon[t]} onChange={(e) => setBon({ ...bon, [t]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="row"><button onClick={() => save("/api/admin/fusion-bonus", { PRIME: Number(bon.PRIME) || 0, ABSOLUTE: Number(bon.ABSOLUTE) || 0 })}>SIMPAN JACKPOT</button></div>
      {msg && <p className="msg" role="status">{msg}</p>}
    </>
  );
}
