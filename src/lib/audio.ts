import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

let voiceId: string | undefined;

// Pre-rendered open-source TTS clips served from public/audio/<lang>/.
// Falls back to on-device/browser TTS for ids without a rendered clip.
let builtinFiles: Record<string, Record<string, string>> = {};

export async function initBuiltinAudio(lang: string): Promise<number> {
  if (Platform.OS !== 'web' || builtinFiles[lang]) {
    return Object.keys(builtinFiles[lang] ?? {}).length;
  }
  try {
    const res = await fetch(`/audio/${lang}/manifest.json`);
    if (res.ok) {
      builtinFiles[lang] = (await res.json()).files ?? {};
    }
  } catch {
    // no rendered audio yet — TTS fallback handles everything
  }
  return Object.keys(builtinFiles[lang] ?? {}).length;
}

export function builtinAudioUrl(lang: string, id: string): string | null {
  const f = builtinFiles[lang]?.[id];
  return f ? `/audio/${lang}/${f}` : null;
}

// Play by id: rendered clip first, TTS fallback.
export function playText(id: string, text: string, locale: string) {
  const lang = locale.split('-')[0].toLowerCase();
  const url = builtinAudioUrl(lang, id);
  if (url && Platform.OS === 'web') {
    Speech.stop();
    new Audio(url).play().catch(() => speak(text, locale));
  } else {
    speak(text, locale);
  }
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

export function speak(text: string, locale: string, slow = false) {
  Speech.stop();
  Speech.speak(text, {
    language: locale,
    voice: voiceId,
    rate: slow ? 0.5 : 0.9,
  });
}
