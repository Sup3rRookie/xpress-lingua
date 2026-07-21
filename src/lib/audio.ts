import * as Speech from 'expo-speech';

let voiceId: string | undefined;

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
