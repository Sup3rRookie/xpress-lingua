import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import suspectIds from '../data/zh-audio-suspect.json';

// Word clips that failed Whisper verification (wrong/garbled isolated-syllable
// synthesis). Browser TTS is the safer fallback until the Colab re-render.
const SUSPECT = new Set<string>(suspectIds as string[]);

let voiceId: string | undefined;

// Pre-rendered open-source TTS clips served from public/audio/<lang>/.
// Falls back to on-device/browser TTS for ids without a rendered clip.
let builtinFiles: Record<string, Record<string, string>> = {};

export async function initBuiltinAudio(lang: string): Promise<number> {
  if (Platform.OS !== 'web' || builtinFiles[lang]) {
    return Object.keys(builtinFiles[lang] ?? {}).length;
  }
  try {
    // Relative path so the app works from a sub-path host (e.g. GitHub Pages).
    const res = await fetch(`audio/${lang}/manifest.json`);
    if (res.ok) {
      builtinFiles[lang] = (await res.json()).files ?? {};
    }
  } catch {
    // no rendered audio yet, TTS fallback handles everything
  }
  return Object.keys(builtinFiles[lang] ?? {}).length;
}

export function builtinAudioUrl(lang: string, id: string): string | null {
  if (SUSPECT.has(id)) return null;
  const f = builtinFiles[lang]?.[id];
  return f ? `audio/${lang}/${f}` : null;
}

// Only one clip/utterance plays at a time. Starting a new one interrupts the
// current one: it stops the previous audio (or TTS) AND resolves the previous
// promise, so the previous button's "playing" indicator clears immediately. This
// prevents two rows from playing over each other in the tap-to-compare flow.
let stopCurrent: (() => void) | null = null;

export function stopPlayback(): void {
  const s = stopCurrent;
  stopCurrent = null;
  if (s) s();
  else Speech.stop();
}

// Resolves when playback ends, is interrupted, errors, or a safety cap elapses,
// so a caller's "playing" indicator can never get stuck if the browser never
// fires an end event (some engines don't). The cap is a backstop only: the real
// end signal is `onended`/`onDone`.
function withCap(capMs: number, run: (done: () => void) => void): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, capMs);
    try {
      run(done);
    } catch {
      done(); // a synchronous failure still resolves; this promise never rejects
    }
  });
}

// TTS has no known duration, so cap loosely by text length. A rendered clip ends
// on its own `onended`, so it only needs a generous backstop.
const ttsCapMs = (text: string) => Math.min(12000, Math.max(1500, text.length * 400));
const CLIP_CAP_MS = 20000;

// Play by id: rendered clip first, TTS fallback. Returns a promise that resolves
// when playback finishes (or is interrupted / caps out). Fire-and-forget callers
// can ignore it.
export function playText(id: string, text: string, locale: string): Promise<void> {
  const lang = locale.split('-')[0].toLowerCase();
  const url = builtinAudioUrl(lang, id);
  if (!(url && Platform.OS === 'web')) return speak(text, locale);
  stopPlayback();
  return withCap(CLIP_CAP_MS, (done) => {
    // `over` makes end and fallback mutually exclusive: whichever fires first
    // wins, so a late error after the clip already ended can't trigger stray TTS,
    // and onerror + play()-reject can't double-play.
    let over = false;
    const audio = new Audio(url);
    const finish = () => {
      if (over) return;
      over = true;
      if (stopCurrent === stop) stopCurrent = null;
      done();
    };
    const stop = () => {
      try {
        audio.pause();
      } catch {
        // ignore
      }
      finish();
    };
    stopCurrent = stop;
    const fallback = () => {
      if (over) return;
      over = true;
      if (stopCurrent === stop) stopCurrent = null;
      speak(text, locale).finally(done);
    };
    audio.onended = finish;
    audio.onerror = fallback;
    audio.play().catch(fallback);
  });
}

// Web speechSynthesis loads voices lazily; call again on first user interaction.
export async function initVoice(locale: string): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const lang = locale.split('-')[0].toLowerCase();
    const match =
      voices.find((v) => v.language?.toLowerCase() === locale.toLowerCase()) ??
      voices.find((v) => v.language?.toLowerCase().startsWith(lang));
    voiceId = match?.identifier;
    return !!match;
  } catch {
    return false;
  }
}

export function speak(text: string, locale: string, slow = false): Promise<void> {
  stopPlayback();
  return withCap(ttsCapMs(text), (done) => {
    const finish = () => {
      if (stopCurrent === stop) stopCurrent = null;
      done();
    };
    const stop = () => {
      Speech.stop();
      finish();
    };
    stopCurrent = stop;
    Speech.speak(text, {
      language: locale,
      voice: voiceId,
      rate: slow ? 0.5 : 0.9,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  });
}
