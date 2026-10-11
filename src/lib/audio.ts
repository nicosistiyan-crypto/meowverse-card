// Procedural audio for the whole game. There are NO sound files: everything is synthesised with the Web Audio API,
// so nothing to download and nothing to license. It has
//  - a cute cat-themed chiptune loop as the main background music (with soft purrs and the odd meow),
//  - synthesised meows,
//  - one sound design per tier (C ... COLLECTOR), a build-up + impact for the four top tiers,
//  - pack opening and fusion sounds.
// Browsers only allow sound after a click/tap, so call audio.unlock() from a user gesture (AudioDock does this).

export type TierId = "C" | "B" | "A" | "S" | "S_PLUS" | "PRIME" | "ABSOLUTE" | "COLLECTOR";
type Prefs = { music: boolean; sfx: boolean };
type ToneOpt = { type?: OscillatorType; g?: number; a?: number; r?: number; to?: number; wet?: number; det?: number; lp?: number; vib?: number };
type NoiseOpt = { g?: number; type?: BiquadFilterType; f?: number; to?: number; q?: number; a?: number; wet?: number };
type MeowOpt = { pitch?: number; dur?: number; g?: number; bus?: AudioNode; wet?: number };

const KEY = "pc-audio";
const POS = "pc-music-pos";   // where the music is, kept for the case the page is reloaded (sessionStorage)
const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const LEVEL: Partial<Record<TierId, number>> = { S_PLUS: 1, PRIME: 2, ABSOLUTE: 3, COLLECTOR: 4 };

// ---- background music: 8 bars of C - Am - F - G - C - Am - Dm - G at 116 bpm, eighth-note grid (64 steps)
const BPM = 116;
const SD = 60 / BPM / 2;
const MELODY: number[][] = [
  [76, 0, 79, 0, 76, 0, 72, 0], [69, 0, 72, 0, 76, 0, 72, 0], [77, 0, 81, 0, 77, 0, 72, 0], [74, 0, 79, 0, 71, 0, 74, 0],
  [76, 79, 76, 72, 74, 76, 74, 0], [72, 76, 79, 76, 72, 69, 72, 0], [74, 77, 81, 77, 74, 72, 69, 0], [71, 74, 79, 74, 71, 67, 0, 0],
];
const BASS = [48, 45, 41, 43, 48, 45, 38, 43];
const CHORD: number[][] = [[60, 64, 67], [57, 60, 64], [57, 60, 65], [55, 59, 62], [60, 64, 67], [57, 60, 64], [57, 62, 65], [55, 59, 62]];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private wet: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextT = 0;
  private loops = 0;
  private subs = new Set<() => void>();
  private fresh = true;
  prefs: Prefs = { music: true, sfx: true };

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw) as Partial<Prefs>; this.prefs = { music: p.music !== false, sfx: p.sfx !== false }; }
    } catch { /* private mode: keep defaults */ }
    document.addEventListener("visibilitychange", () => {
      const c = this.ctx;
      if (!c) return;
      if (document.hidden) void c.suspend(); else if (this.prefs.music || this.prefs.sfx) void c.resume();
    });
  }

  // ---------------------------------------------------------------- setup / prefs
  get running(): boolean { return this.ctx?.state === "running"; }
  subscribe(fn: () => void): () => void { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit(): void {
    try { window.localStorage.setItem(KEY, JSON.stringify(this.prefs)); } catch { /* ignore */ }
    this.subs.forEach((f) => f());
  }

  /** Call from a click / tap / key press. Creates the audio graph the first time and starts the music. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) this.build();
    const c = this.ctx;
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    if (this.prefs.music) this.startMusic();
  }

  private build(): void {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    const master = c.createGain(); master.gain.value = 0.85;
    master.connect(comp); comp.connect(c.destination);
    const musicBus = c.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    const sfxBus = c.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    // a small generated "room" for sparkle sounds
    const len = Math.floor(c.sampleRate * 1.6), imp = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = c.createConvolver(); conv.buffer = imp;
    const wet = c.createGain(); wet.gain.value = 0.5; wet.connect(conv); conv.connect(master);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.ctx = c; this.master = master; this.musicBus = musicBus; this.sfxBus = sfxBus; this.wet = wet; this.noiseBuf = nb;
  }

  setMusic(on: boolean): void {
    this.prefs.music = on; this.emit();
    if (on) this.unlock(); else this.stopMusic();
  }
  setSfx(on: boolean): void { this.prefs.sfx = on; this.emit(); if (on) this.unlock(); }

  // ---------------------------------------------------------------- low level voices
  private get ok(): boolean { return !!this.ctx && this.ctx.state !== "closed"; }
  private get sfxOn(): boolean { return this.ok && this.prefs.sfx; }
  private now(): number { return (this.ctx as AudioContext).currentTime + 0.03; }

  private tone(bus: AudioNode, t: number, f: number, dur: number, o: ToneOpt = {}): void {
    const c = this.ctx as AudioContext;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type ?? "square";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.det) osc.detune.value = o.det;
    const a = o.a ?? 0.005, peak = o.g ?? 0.15, r = o.r ?? Math.min(0.2, dur * 0.6), hold = Math.max(a + 0.002, dur - r);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    let node: AudioNode = osc;
    if (o.vib) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = o.vib; lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.06);
    }
    if (o.lp) { const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.lp; node.connect(lp); node = lp; }
    node.connect(g); g.connect(bus);
    if (o.wet && this.wet) { const s = c.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(this.wet); }
    osc.start(t); osc.stop(t + dur + 0.06);
  }

  private noise(bus: AudioNode, t: number, dur: number, o: NoiseOpt = {}): void {
    const c = this.ctx as AudioContext;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = o.type ?? "bandpass"; fl.Q.value = o.q ?? 1;
    fl.frequency.setValueAtTime(o.f ?? 3000, t);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = c.createGain(), a = o.a ?? 0.004, peak = o.g ?? 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    src.connect(fl); fl.connect(g); g.connect(bus);
    if (o.wet && this.wet) { const s = c.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(this.wet); }
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  /** Synthesised "meow": a sawtooth that glides up and down, shaped by two moving vocal formants. */
  private meow(t: number, o: MeowOpt = {}): void {
    const c = this.ctx as AudioContext, d = o.dur ?? 0.5, p = o.pitch ?? 1, bus = o.bus ?? (this.sfxBus as AudioNode), peak = o.g ?? 0.2;
    const osc = c.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(430 * p, t);
    osc.frequency.linearRampToValueAtTime(900 * p, t + d * 0.3);
    osc.frequency.linearRampToValueAtTime(560 * p, t + d);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 6.5; lg.gain.value = 14 * p; lfo.connect(lg); lg.connect(osc.frequency);
    const f1 = c.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 4;
    f1.frequency.setValueAtTime(520, t); f1.frequency.linearRampToValueAtTime(1050, t + d * 0.3); f1.frequency.linearRampToValueAtTime(680, t + d);
    const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 5;
    f2.frequency.setValueAtTime(1700, t); f2.frequency.linearRampToValueAtTime(2800, t + d * 0.35); f2.frequency.linearRampToValueAtTime(1500, t + d);
    const g2 = c.createGain(); g2.gain.value = 0.55;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.05);
    env.gain.setValueAtTime(peak, t + Math.max(0.06, d - 0.16));
    env.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
    osc.connect(f1); osc.connect(f2); f1.connect(env); f2.connect(g2); g2.connect(env); env.connect(bus);
    if (o.wet && this.wet) { const s = c.createGain(); s.gain.value = o.wet; env.connect(s); s.connect(this.wet); }
    osc.start(t); osc.stop(t + d + 0.06); lfo.start(t); lfo.stop(t + d + 0.06);
  }

  private duck(ms: number): void {
    if (!this.ctx || !this.musicBus) return;
    const g = this.musicBus.gain, n = this.ctx.currentTime;
    g.cancelScheduledValues(n);
    g.setTargetAtTime(0.22, n, 0.08);
    g.setTargetAtTime(1, n + ms / 1000, 0.45);
  }

  // ---------------------------------------------------------------- background music
  startMusic(): void {
    const c = this.ctx;
    if (!c || !this.musicBus || this.timer) return;
    const r = this.fresh ? this.resumePos() : { s: 0, l: 0 };   // first start of this page load: carry on where the music was, not from the top
    this.fresh = false;
    this.step = r.s; this.loops = r.l; this.nextT = c.currentTime + 0.12;
    this.musicBus.gain.cancelScheduledValues(c.currentTime);
    this.musicBus.gain.setValueAtTime(0.0001, c.currentTime);
    this.musicBus.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
    this.timer = setInterval(() => this.pump(), 100);
  }
  private resumePos(): { s: number; l: number } {
    try {
      const raw = window.sessionStorage.getItem(POS);
      if (raw) {
        const p = JSON.parse(raw) as { s: number; l: number; at: number };
        const gone = Date.now() - p.at;                          // ms since that step was due to play
        if (Number.isFinite(gone) && gone > -3000 && gone < 120000) {
          const total = p.s + Math.max(0, Math.round(gone / (SD * 1000)));
          return { s: total % 64, l: p.l + Math.floor(total / 64) };
        }
      }
    } catch { /* storage blocked: start from the top */ }
    return { s: 0, l: 0 };
  }
  private savePos(s: number, t: number): void {
    try { window.sessionStorage.setItem(POS, JSON.stringify({ s, l: this.loops, at: Date.now() + Math.max(0, (t - (this.ctx as AudioContext).currentTime) * 1000) })); } catch { /* ignore */ }
  }
  stopMusic(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.ctx && this.musicBus) { const n = this.ctx.currentTime; this.musicBus.gain.cancelScheduledValues(n); this.musicBus.gain.setTargetAtTime(0, n, 0.12); }
  }
  private pump(): void {
    const c = this.ctx;
    if (!c || !this.prefs.music) return;
    if (this.nextT < c.currentTime - 1) this.nextT = c.currentTime + 0.05;   // tab was frozen: do not replay the backlog
    while (this.nextT < c.currentTime + 1.5) {   // schedule 1.5 s ahead: a busy main thread (page change) cannot make the music stutter
      if (this.step % 2 === 0) this.savePos(this.step, this.nextT);
      this.musicStep(this.step, this.nextT);
      this.nextT += SD;
      this.step = (this.step + 1) % 64;
      if (this.step === 0) this.loops++;
    }
  }
  private musicStep(s: number, t: number): void {
    const bus = this.musicBus as AudioNode, bar = Math.floor(s / 8), k = s % 8;
    const m = MELODY[bar][k];
    if (m) this.tone(bus, t, mtof(m), SD * 1.7, { type: "square", g: 0.05, a: 0.004, r: 0.12, lp: 3200 });
    if (k === 0 || k === 3 || k === 4 || k === 6) this.tone(bus, t, mtof(BASS[bar]), SD * 1.8, { type: "triangle", g: 0.16, a: 0.003, r: 0.2 });
    if (k === 2 || k === 6) CHORD[bar].forEach((n) => this.tone(bus, t, mtof(n), SD * 0.9, { type: "triangle", g: 0.03, a: 0.004, r: 0.1 }));
    if (k === 0 || k === 4) this.tone(bus, t, 150, 0.1, { type: "sine", g: 0.1, to: 55 });                       // soft paw tap
    if (k % 2 === 1) this.noise(bus, t, 0.03, { type: "highpass", f: 7000, g: 0.018 });
    if (k === 4) this.noise(bus, t, 0.08, { type: "bandpass", f: 1800, g: 0.03 });
    if (k === 0 && bar % 4 === 0) this.tone(bus, t, mtof(96), 0.9, { type: "sine", g: 0.035, wet: 0.7 });          // little bell
    if (s === 62 && this.loops % 2 === 1) this.meow(t, { pitch: 1.35, dur: 0.38, g: 0.06, bus });                 // an occasional meow
    if (s === 56 && this.loops % 2 === 0) this.purr(t, 1.3, bus);
  }
  private purr(t: number, dur: number, bus: AudioNode): void {
    const c = this.ctx as AudioContext;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170;
    const g = c.createGain(); g.gain.value = 0.045;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 24; lg.gain.value = 0.045; lfo.connect(lg); lg.connect(g.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(1, t + 0.25); env.gain.setValueAtTime(1, t + dur - 0.3); env.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(env); env.connect(bus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- pack opening
  packCharge(ms: number): void {
    if (!this.sfxOn) return;
    const c = this.ctx as AudioContext, bus = this.sfxBus as AudioNode, t = this.now(), d = ms / 1000;
    this.duck(ms + 600);
    const rum = c.createOscillator(), g = c.createGain();
    rum.type = "sine"; rum.frequency.setValueAtTime(48, t); rum.frequency.exponentialRampToValueAtTime(95, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + d);
    rum.connect(g); g.connect(bus); rum.start(t); rum.stop(t + d + 0.1);
    this.tone(bus, t, 220, d, { type: "triangle", g: 0.06, to: 780, a: d * 0.9, r: 0.05 });
    for (let i = 0; i < 26; i++) {                           // foil crinkle, more and more of it
      const at = t + Math.pow(i / 26, 0.7) * d;
      this.noise(bus, at, 0.03, { type: "bandpass", f: 4000 + Math.random() * 5000, q: 2, g: 0.05 + (i / 26) * 0.05 });
    }
  }
  packTear(): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    this.noise(bus, t, 0.38, { type: "bandpass", f: 900, to: 6500, q: 1.2, g: 0.22 });
    for (let i = 0; i < 7; i++) this.noise(bus, t + i * 0.045, 0.03, { type: "highpass", f: 5000, g: 0.1 });
    this.tone(bus, t + 0.32, 760, 0.16, { type: "sine", g: 0.3, to: 190 });
    [96, 100, 103, 108].forEach((n, i) => this.tone(bus, t + 0.34 + i * 0.05, mtof(n), 0.5, { type: "sine", g: 0.06, wet: 0.6 }));
    this.meow(t + 0.45, { pitch: 1.35, dur: 0.24, g: 0.1 });
  }

  // ---------------------------------------------------------------- tier build-up / impact / reveal
  /** Rising tension for S+ and above. Lasts `ms`; the visual flash happens at the end, then call impact(). */
  buildup(tier: TierId, ms: number): void {
    const lvl = LEVEL[tier];
    if (!this.sfxOn || !lvl) return;
    const c = this.ctx as AudioContext, bus = this.sfxBus as AudioNode, t = this.now(), d = ms / 1000;
    this.duck(ms + 2200);
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = lvl >= 3 ? "sawtooth" : "triangle";
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(110 * (4 + lvl * 2), t + d);
    lp.type = "lowpass"; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2500 + lvl * 800, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 + 0.02 * lvl, t + d);
    o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.1);
    this.noise(bus, t, d, { type: "bandpass", f: 400, to: 6000, q: 0.8, g: 0.05 + 0.015 * lvl, a: d * 0.9 });
    if (lvl >= 2) { let at = t + 0.2, gap = 0.55; while (at < t + d) { this.tone(bus, at, 70, 0.16, { type: "sine", g: 0.22 + 0.04 * lvl, to: 38 }); at += gap; gap = Math.max(0.16, gap * 0.82); } }
    if (lvl >= 3) this.tone(bus, t, 42, d, { type: "sine", g: 0.22, a: d * 0.8, r: 0.1, vib: 3 });
    if (lvl >= 4) {                                          // drum roll that speeds up, then a curtain rustle
      let at = t + d * 0.25, gap = 0.12;
      while (at < t + d) { this.noise(bus, at, 0.05, { type: "bandpass", f: 1800, q: 1.4, g: 0.06 + 0.1 * ((at - t) / d) }); at += gap; gap = Math.max(0.03, gap * 0.93); }
      this.noise(bus, t + d * 0.3, d * 0.5, { type: "lowpass", f: 900, g: 0.07, a: d * 0.2 });
      const hit = t + 1.9;                                   // the COLLECTOR title slams in here: thunder crack, shaking rumble, gold shimmer
      this.tone(bus, hit, 110, 0.9, { type: "sine", g: 0.38, to: 30 });
      this.tone(bus, hit, 55, 1.4, { type: "sawtooth", g: 0.09, lp: 300, vib: 14 });
      this.noise(bus, hit, 0.7, { type: "lowpass", f: 1200, to: 200, g: 0.3 });
      for (let i = 0; i < 4; i++) this.noise(bus, hit + i * 0.11, 0.1, { type: "highpass", f: 3000, g: 0.14, wet: 0.5 });
      [84, 91, 96, 103].forEach((m, i) => this.tone(bus, hit + 0.1 + i * 0.07, mtof(m), 0.8, { type: "triangle", g: 0.045, wet: 0.7 }));
    }
  }
  impact(tier: TierId): void {
    const lvl = LEVEL[tier] ?? 0;
    if (!this.sfxOn || !lvl) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    this.tone(bus, t, 120, 0.5 + lvl * 0.15, { type: "sine", g: 0.3 + lvl * 0.06, to: 32 });
    this.noise(bus, t, 0.5 + lvl * 0.25, { type: "highpass", f: 1800, g: 0.08 + lvl * 0.02, wet: 0.4 });
    if (lvl >= 3) this.noise(bus, t, 0.6, { type: "lowpass", f: 700, g: 0.25 });
  }

  /** COLLECTOR only: the golden card streaking in. A whoosh that slows down, a rising shimmer and a glittering trail of pings. Lasts `ms`; call collectorLand() when it arrives. */
  collectorFly(ms: number): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now(), d = ms / 1000;
    this.duck(ms + 1400);
    this.noise(bus, t, d * 0.9, { type: "bandpass", f: 7000, to: 700, q: 1.1, g: 0.16, a: 0.05, wet: 0.3 });        // whoosh, high to low as the card slows
    this.noise(bus, t + 0.05, d * 0.8, { type: "highpass", f: 3200, to: 1200, g: 0.05 });
    this.tone(bus, t, 330, d, { type: "triangle", g: 0.07, to: 1320, a: d * 0.5, r: 0.2, vib: 6, wet: 0.4 });      // rising shimmer
    this.tone(bus, t, 335, d, { type: "sine", g: 0.05, to: 1340, a: d * 0.5, r: 0.2, det: 12, wet: 0.5 });
    const pent = [84, 86, 88, 91, 93, 96, 98, 100], n = Math.floor(d * 28);
    for (let i = 0; i < n; i++) {                                                                                  // gold sparkle trail: pings climb in pitch as the card nears
      const p = i / n, at = t + 0.04 + p * d * 0.95;
      const note = pent[Math.min(pent.length - 1, Math.floor(p * pent.length * 0.9 + Math.random() * 2))];
      this.tone(bus, at, mtof(note), 0.12 + Math.random() * 0.12, { type: "sine", g: 0.022 + Math.random() * 0.022, a: 0.002, wet: 0.7 });
      if (i % 2 === 0) this.noise(bus, at, 0.03, { type: "highpass", f: 8500, g: 0.02 + Math.random() * 0.02 });
    }
  }
  /** COLLECTOR only: the card lands in its spot, a soft thud and a bright golden "ching" with a burst of glitter. */
  collectorLand(): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    this.tone(bus, t, 140, 0.45, { type: "sine", g: 0.3, to: 40 });
    this.noise(bus, t, 0.5, { type: "highpass", f: 4000, g: 0.09, wet: 0.5 });
    [84, 88, 91, 96].forEach((m, i) => this.tone(bus, t + i * 0.035, mtof(m), 0.9, { type: "triangle", g: 0.07, wet: 0.7 }));
    this.tone(bus, t, mtof(108), 1.1, { type: "sine", g: 0.03, wet: 0.8 });
    for (let i = 0; i < 24; i++) this.noise(bus, t + Math.random() * 0.7, 0.03, { type: "bandpass", f: 4000 + Math.random() * 4000, q: 3, g: 0.04 });
  }

  /** The sound of the card turning face up, one sound design per tier. */
  reveal(tier: TierId): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    const arp = (notes: number[], step: number, o: ToneOpt, at = 0, dur = 0.2) => notes.forEach((n, i) => this.tone(bus, t + at + i * step, mtof(n), dur, o));
    switch (tier) {
      case "C":
        arp([84, 88], 0.07, { type: "square", g: 0.09, lp: 4000 }, 0, 0.1);
        this.meow(t + 0.12, { pitch: 1.0, dur: 0.38, g: 0.14 });
        break;
      case "B":
        arp([84, 88, 91], 0.075, { type: "square", g: 0.1, lp: 4000 }, 0, 0.12);
        this.meow(t + 0.2, { pitch: 1.12, dur: 0.4, g: 0.15 });
        break;
      case "A":
        this.duck(1600);
        arp([72, 76, 79, 84, 88], 0.07, { type: "triangle", g: 0.14, wet: 0.3 }, 0, 0.25);
        this.tone(bus, t + 0.35, mtof(96), 0.7, { type: "sine", g: 0.06, wet: 0.7 });
        this.meow(t + 0.3, { pitch: 1.22, dur: 0.45, g: 0.16 });
        break;
      case "S":
        this.duck(2200);
        [60, 64, 67, 72].forEach((n) => this.tone(bus, t, mtof(n), 0.55, { type: "sawtooth", g: 0.05, lp: 2400, wet: 0.3 }));
        arp([79, 83, 86, 91, 95], 0.06, { type: "square", g: 0.07, lp: 4500, wet: 0.4 }, 0.1, 0.22);
        this.noise(bus, t, 0.7, { type: "highpass", f: 6000, g: 0.04, wet: 0.5 });
        this.meow(t + 0.25, { pitch: 1.15, dur: 0.42, g: 0.15 }); this.meow(t + 0.55, { pitch: 1.38, dur: 0.45, g: 0.15 });
        break;
      case "S_PLUS":
        this.duck(3000);
        this.tone(bus, t, 200, 0.35, { type: "sawtooth", g: 0.06, to: 1800, lp: 3000 });
        [55, 62, 67, 71, 74].forEach((n) => this.tone(bus, t + 0.35, mtof(n), 1.0, { type: "sawtooth", g: 0.05, lp: 3000, wet: 0.35 }));
        arp([79, 83, 86, 91, 95, 98, 103], 0.05, { type: "sine", g: 0.07, wet: 0.55 }, 0.4, 0.4);
        for (let i = 0; i < 12; i++) this.noise(bus, t + 0.4 + i * 0.06, 0.04, { type: "highpass", f: 8000, g: 0.05 });
        [1.2, 1.5, 1.8].forEach((p, i) => this.meow(t + 0.45 + i * 0.25, { pitch: p, dur: 0.4, g: 0.15, wet: 0.2 }));
        break;
      case "PRIME":
        this.duck(4000);
        [64, 71, 76, 79].forEach((n) => this.tone(bus, t, mtof(n), 1.8, { type: "triangle", g: 0.05, a: 0.15, r: 0.8, wet: 0.6 }));
        arp([84, 88, 91, 96, 100, 103, 108, 103, 100, 96], 0.09, { type: "sine", g: 0.08, wet: 0.8 }, 0.05, 0.6);
        [3500, 3520, 4700].forEach((f) => this.tone(bus, t, f, 1.5, { type: "sine", g: 0.012, a: 0.4, r: 1.0, wet: 0.7 }));
        this.meow(t + 0.5, { pitch: 1.55, dur: 0.85, g: 0.13, wet: 0.5 });
        break;
      case "ABSOLUTE":
        this.duck(4600);
        this.tone(bus, t, 90, 1.0, { type: "sine", g: 0.45, to: 32 });
        this.noise(bus, t, 1.3, { type: "highpass", f: 1500, g: 0.11, wet: 0.5 });
        [48, 55, 60, 64, 67].forEach((n) => [-9, 9].forEach((det) => this.tone(bus, t + 0.05, mtof(n), 1.5, { type: "sawtooth", g: 0.035, det, lp: 2600, wet: 0.3 })));
        for (let i = 0; i < 16; i++) this.noise(bus, t + 0.15 + Math.random() * 1.4, 0.035, { type: "bandpass", f: 2500 + Math.random() * 2500, q: 3, g: 0.06 });
        arp([84, 91, 96], 0.2, { type: "sine", g: 0.07, wet: 0.7 }, 0.5, 0.9);
        this.meow(t + 0.3, { pitch: 0.6, dur: 1.0, g: 0.2 }); this.meow(t + 0.7, { pitch: 0.78, dur: 0.8, g: 0.16 });
        break;
      case "COLLECTOR": {
        this.duck(5600);
        this.noise(bus, t, 0.7, { type: "bandpass", f: 300, to: 5000, q: 0.9, g: 0.12 });
        const mel = [[72, 0, 0.14], [76, 0.14, 0.14], [79, 0.28, 0.14], [84, 0.42, 0.2], [88, 0.64, 1.3]];
        mel.forEach(([n, at, d]) => this.tone(bus, t + 0.2 + at, mtof(n), d, { type: "sawtooth", g: 0.07, lp: 3500, vib: 9, wet: 0.4 }));
        [60, 64, 67, 72].forEach((n) => this.tone(bus, t + 0.85, mtof(n), 1.2, { type: "triangle", g: 0.07, wet: 0.4 }));
        for (let i = 0; i < 70; i++) this.noise(bus, t + 0.5 + Math.random() * 1.9, 0.02 + Math.random() * 0.03, { type: "bandpass", f: 2500 + Math.random() * 3500, q: 1, g: 0.015 + Math.random() * 0.03 });
        arp([96, 100, 103, 108, 103, 100], 0.11, { type: "sine", g: 0.05, wet: 0.8 }, 1.0, 0.6);
        [1.0, 1.25, 1.5].forEach((p, i) => this.meow(t + 0.55 + i * 0.12, { pitch: p, dur: 0.7, g: 0.12, wet: 0.3 }));
        break;
      }
    }
  }

  // ---------------------------------------------------------------- fusion
  fuseCharge(ms: number): void {
    if (!this.sfxOn) return;
    const c = this.ctx as AudioContext, bus = this.sfxBus as AudioNode, t = this.now(), d = ms / 1000;
    this.duck(ms + 600);
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(1700, t + d);
    lfo.frequency.setValueAtTime(3, t); lfo.frequency.exponentialRampToValueAtTime(30, t + d);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0.12, t + d);
    lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.1); lfo.start(t); lfo.stop(t + d + 0.1);
    this.tone(bus, t, 55, d, { type: "sine", g: 0.2, a: d * 0.9, r: 0.05 });
    this.noise(bus, t, d, { type: "bandpass", f: 500, to: 5000, q: 1.2, g: 0.06, a: d * 0.9 });
    for (let i = 0; i < 16; i++) this.tone(bus, t + (i / 16) * d, mtof(84 + [0, 4, 7, 12][i % 4]), 0.25, { type: "sine", g: 0.04, wet: 0.5 });
  }
  fuseImpact(): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    this.tone(bus, t, 1700, 0.25, { type: "sine", g: 0.12, to: 60 });
    this.tone(bus, t + 0.2, 90, 0.7, { type: "sine", g: 0.42, to: 30 });
    this.noise(bus, t + 0.2, 0.5, { type: "lowpass", f: 1200, g: 0.2 });
    this.noise(bus, t + 0.22, 0.7, { type: "highpass", f: 3000, g: 0.07, wet: 0.5 });
  }
  /** Small jingle for the fusion banner. The tier sound itself is reveal(tier) when the card turns over. */
  fuseResult(kind: string, upgraded: boolean): void {
    if (!this.sfxOn) return;
    const bus = this.sfxBus as AudioNode, t = this.now();
    this.duck(2200);
    if (kind === "bonus") {
      [72, 76, 79, 84, 88, 91].forEach((n, i) => this.tone(bus, t + i * 0.07, mtof(n), 0.35, { type: "square", g: 0.08, lp: 4200, wet: 0.4 }));
      [60, 64, 67, 72].forEach((n) => this.tone(bus, t + 0.4, mtof(n), 0.9, { type: "sawtooth", g: 0.045, lp: 2800, wet: 0.4 }));
      [1.1, 1.4, 1.7].forEach((p, i) => this.meow(t + 0.4 + i * 0.14, { pitch: p, dur: 0.45, g: 0.14 }));
    } else if (upgraded) {
      [67, 72, 76, 79, 84].forEach((n, i) => this.tone(bus, t + i * 0.08, mtof(n), 0.3, { type: "triangle", g: 0.13, wet: 0.35 }));
      this.meow(t + 0.4, { pitch: 1.3, dur: 0.4, g: 0.15 });
    } else {
      [64, 60].forEach((n, i) => this.tone(bus, t + i * 0.18, mtof(n), 0.35, { type: "triangle", g: 0.12 }));
      this.meow(t + 0.3, { pitch: 0.8, dur: 0.6, g: 0.15 });
    }
  }
}

// One engine for the whole tab, kept on globalThis: even if this module is evaluated again (dev hot reload, a second bundle chunk)
// the same engine, and the same music, carries on instead of a second one starting from the top.
const g = globalThis as unknown as { __pcAudio?: AudioEngine };
export const audio: AudioEngine = g.__pcAudio ?? (g.__pcAudio = new AudioEngine());
