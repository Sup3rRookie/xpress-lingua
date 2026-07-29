import { Platform } from 'react-native';

// Pronunciation check v1: browser speech recognition (Chrome/Edge, on-device or
// vendor-provided, free). "A machine understood you" is an honest intelligibility
// signal. Phoneme-level scoring (wav2vec2) is the planned upgrade.

type AnySpeechRecognition = any;

function getRecognition(): AnySpeechRecognition | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function speechCheckSupported(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface CheckResult {
  status: 'match' | 'close' | 'miss' | 'error';
  heard: string;
}

// Keep only script characters so punctuation/spacing never affects the comparison.
// Mandarin targets are hanzi; Japanese targets MUST keep kana too, otherwise most
// of the sentence is thrown away and a kana-only target normalises to "" - which
// `got.includes(want)` then matches against anything, passing the card no matter
// what was said. Returns the normaliser to use for both target and transcript.
const SCRIPT_ZH = /[^一-鿿]/g;
const SCRIPT_JA = /[^一-鿿぀-ヿｦ-ﾟ]/g;
// Sits inside the kana block but is punctuation, not speech: speech recognition
// never emits it, so keeping it would make those targets ungradable.
const JA_NOISE = /[・ヽヾゝゞ゛゜]/g;
const PUNCT_ONLY = /[\s、。，．！？!?…「」『』（）()・~～]/g;

function normalizerFor(locale: string, target: string): (s: string) => string {
  const isJa = locale.toLowerCase().startsWith('ja');
  const re = isJa ? SCRIPT_JA : SCRIPT_ZH;
  const script = isJa
    ? (s: string) => s.replace(JA_NOISE, '').replace(re, '')
    : (s: string) => s.replace(re, '');
  // A few targets are all loanword latin or digits and have no script characters
  // at all. Fall back to stripping punctuation so the check still compares
  // something real rather than an empty string.
  return script(target) ? script : (s: string) => s.replace(PUNCT_ONLY, '');
}

export function checkPronunciation(target: string, locale: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const rec = getRecognition();
    if (!rec) return resolve({ status: 'error', heard: '' });
    rec.lang = locale;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    let settled = false;
    const done = (r: CheckResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    rec.onresult = (e: any) => {
      const norm = normalizerFor(locale, target);
      // Some deck entries list synonyms ("いい; よい"). Saying any one of them is
      // correct; concatenating them makes an unsayable target that always fails.
      const wants = target
        .split(/[;；]/)
        .map((t) => norm(t))
        .filter(Boolean);
      const alternatives: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) {
        alternatives.push(e.results[0][i].transcript ?? '');
      }
      const heard = alternatives[0] ?? '';
      // Nothing comparable left: never pass the card by default.
      if (!wants.length) return done({ status: 'miss', heard });
      // A near-miss only counts on a target long enough for one dropped character
      // to still be most of the word. Otherwise a 2-character target would pass on
      // a single character being recognised.
      const enough = (want: string, got: string) =>
        got.length >= Math.max(want.length - 1, Math.min(want.length, 3));
      const hit = alternatives.some((a) => {
        const got = norm(a);
        if (!got) return false;
        return wants.some(
          (want) =>
            got === want ||
            got.includes(want) ||
            (want.length > 1 && want.includes(got) && enough(want, got)),
        );
      });
      if (hit) return done({ status: 'match', heard });
      // Partial credit: more than half the target characters recognized.
      const got = norm(heard);
      const best = wants.reduce((a, b) => {
        const score = (w: string) => [...w].filter((ch) => got.includes(ch)).length / w.length;
        return score(b) > score(a) ? b : a;
      });
      const overlap = [...best].filter((ch) => got.includes(ch)).length;
      done({ status: overlap * 2 > best.length ? 'close' : 'miss', heard });
    };
    rec.onerror = () => done({ status: 'error', heard: '' });
    rec.onend = () => done({ status: 'miss', heard: '' });
    try {
      rec.start();
    } catch {
      done({ status: 'error', heard: '' });
    }
  });
}
