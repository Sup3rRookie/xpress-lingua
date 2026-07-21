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

// Keep only hanzi so punctuation/spacing never affects the comparison.
const hanziOnly = (s: string) => s.replace(/[^一-鿿]/g, '');

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
      const want = hanziOnly(target);
      const alternatives: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) {
        alternatives.push(e.results[0][i].transcript ?? '');
      }
      const heard = alternatives[0] ?? '';
      const hit = alternatives.some((a) => {
        const got = hanziOnly(a);
        return got === want || got.includes(want) || (want.length > 1 && want.includes(got) && got.length >= want.length - 1);
      });
      if (hit) return done({ status: 'match', heard });
      // Partial credit: more than half the target characters recognized.
      const got = hanziOnly(heard);
      const overlap = [...want].filter((ch) => got.includes(ch)).length;
      done({ status: overlap * 2 > want.length ? 'close' : 'miss', heard });
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
