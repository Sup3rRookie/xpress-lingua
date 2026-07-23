// Pitch-contour extraction for Mandarin tone feedback (web only).
// F0 tracking: YIN-style cumulative mean normalized difference per frame,
// then median smoothing, semitone normalization against the speaker's own
// median F0 (voice-range independent), trim, and resample to 64 points.

const FRAME_MS = 40;
const HOP_MS = 10;
const F0_MIN = 60; // Hz
const F0_MAX = 450; // Hz
const YIN_THRESHOLD = 0.15;
const SILENCE_GATE = 0.01; // × max frame RMS
const CONTOUR_POINTS = 64;
const TARGET_SR = 16000; // decimate high sample rates, F0 lives well below this

const contourCache = new Map<string, number[]>();

// Fetch + decode a clip and extract its contour. Null on any failure
// (non-web, fetch error, undecodable audio), callers hide the feature.
export async function contourFromUrl(url: string): Promise<number[] | null> {
  const cached = contourCache.get(url);
  if (cached) return cached;
  try {
    if (typeof window === 'undefined') return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ctx = new Ctor();
    try {
      // Callback form keeps old webkit implementations happy; modern ones
      // also return a promise (double-resolve is harmless).
      const audio = await new Promise<AudioBuffer>((resolve, reject) => {
        const maybe = ctx.decodeAudioData(buf, resolve, reject);
        if (maybe && typeof (maybe as Promise<AudioBuffer>).then === 'function') {
          (maybe as Promise<AudioBuffer>).then(resolve, reject);
        }
      });
      const contour = extractContour(audio.getChannelData(0), audio.sampleRate);
      contourCache.set(url, contour);
      return contour;
    } finally {
      ctx.close?.().catch(() => {});
    }
  } catch {
    return null;
  }
}

// Crude box-filter decimation, enough anti-aliasing for periodicity tracking.
function downsample(
  samples: Float32Array,
  sampleRate: number
): { s: Float32Array; sr: number } {
  const factor = Math.floor(sampleRate / TARGET_SR);
  if (factor <= 1) return { s: samples, sr: sampleRate };
  const n = Math.floor(samples.length / factor);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const base = i * factor;
    for (let j = 0; j < factor; j++) acc += samples[base + j];
    out[i] = acc / factor;
  }
  return { s: out, sr: sampleRate / factor };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// YIN (difference function + cumulative mean normalized difference) on one frame.
// Returns F0 in Hz, or NaN when no acceptable period is found.
function frameF0(
  x: Float32Array,
  start: number,
  frameLen: number,
  minLag: number,
  maxLag: number,
  sr: number
): number {
  const w = frameLen - maxLag; // same comparison-window length for every lag
  if (w < 32) return NaN;

  const d = new Float64Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = x[start + i] - x[start + i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  const cmnd = new Float64Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  // First dip below threshold, walked forward to its local minimum.
  let tauEst = -1;
  for (let tau = minLag; tau <= maxLag; tau++) {
    if (cmnd[tau] < YIN_THRESHOLD) {
      while (tau + 1 <= maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst < 0) return NaN;

  // Parabolic interpolation for sub-sample lag accuracy.
  let refined = tauEst;
  if (tauEst > 1 && tauEst < maxLag) {
    const a = cmnd[tauEst - 1];
    const b = cmnd[tauEst];
    const c = cmnd[tauEst + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) {
      const offset = (a - c) / (2 * denom);
      if (offset > -1 && offset < 1) refined = tauEst + offset;
    }
  }

  const f0 = sr / refined;
  return f0 >= F0_MIN && f0 <= F0_MAX ? f0 : NaN;
}

// Mono samples → 64-point contour in semitones relative to the speaker's
// median F0. NaN marks unvoiced stretches. Display clamping happens in the UI.
export function extractContour(samples: Float32Array, sampleRate: number): number[] {
  const empty = () => new Array<number>(CONTOUR_POINTS).fill(NaN);
  if (!samples.length || sampleRate <= 0) return empty();

  const { s, sr } = downsample(samples, sampleRate);
  const frameLen = Math.round((FRAME_MS / 1000) * sr);
  const hop = Math.max(1, Math.round((HOP_MS / 1000) * sr));
  const minLag = Math.max(2, Math.floor(sr / F0_MAX));
  const maxLag = Math.min(Math.ceil(sr / F0_MIN), frameLen - 32);
  if (s.length < frameLen || maxLag <= minLag) return empty();

  const nFrames = Math.floor((s.length - frameLen) / hop) + 1;

  // Frame energies for the silence gate.
  const rms = new Float64Array(nFrames);
  let maxRms = 0;
  for (let f = 0; f < nFrames; f++) {
    const base = f * hop;
    let acc = 0;
    for (let i = 0; i < frameLen; i++) acc += s[base + i] * s[base + i];
    rms[f] = Math.sqrt(acc / frameLen);
    if (rms[f] > maxRms) maxRms = rms[f];
  }
  if (maxRms === 0) return empty();

  const gate = SILENCE_GATE * maxRms;
  const f0: number[] = new Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    f0[f] = rms[f] < gate ? NaN : frameF0(s, f * hop, frameLen, minLag, maxLag, sr);
  }

  // 3-point median filter over voiced frames (kills octave-glitch spikes).
  const smoothed = f0.map((v, i) => {
    if (!Number.isFinite(v)) return NaN;
    const win = [f0[i - 1], v, f0[i + 1]].filter((n) => Number.isFinite(n));
    return median(win);
  });

  // Hz → semitones re the speaker's own median F0 (comparable across voices).
  const voiced = smoothed.filter((v) => Number.isFinite(v));
  if (!voiced.length) return empty();
  const medF0 = median(voiced);
  const st = smoothed.map((v) => (Number.isFinite(v) ? 12 * Math.log2(v / medF0) : NaN));

  // Trim leading/trailing unvoiced frames.
  let lo = 0;
  while (lo < st.length && !Number.isFinite(st[lo])) lo++;
  let hi = st.length - 1;
  while (hi >= lo && !Number.isFinite(st[hi])) hi--;
  const trimmed = st.slice(lo, hi + 1);
  if (!trimmed.length) return empty();
  if (trimmed.length === 1) return new Array<number>(CONTOUR_POINTS).fill(trimmed[0]);

  // NaN-aware linear resample to exactly CONTOUR_POINTS.
  const out = new Array<number>(CONTOUR_POINTS);
  const scale = (trimmed.length - 1) / (CONTOUR_POINTS - 1);
  for (let i = 0; i < CONTOUR_POINTS; i++) {
    const pos = i * scale;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, trimmed.length - 1);
    const frac = pos - i0;
    const a = trimmed[i0];
    const b = trimmed[i1];
    const aOk = Number.isFinite(a);
    const bOk = Number.isFinite(b);
    if (aOk && bOk) out[i] = a + (b - a) * frac;
    else if (aOk && frac <= 0.5) out[i] = a;
    else if (bOk && frac >= 0.5) out[i] = b;
    else out[i] = NaN;
  }
  return out;
}

// Mean |Δsemitones| over mutually-voiced points → 0–100 score.
// Null when the curves share too little voiced material to compare.
export function similarity(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      sum += Math.abs(a[i] - b[i]);
      count++;
    }
  }
  if (count < 8) return null;
  return Math.round(Math.max(0, 100 - (sum / count) * 18));
}
