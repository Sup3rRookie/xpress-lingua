// Detect Mandarin tone (1-4, 5 = neutral) from tone-marked pinyin diacritics.
const TONE_MARKS: Record<string, number> = {
  ā: 1, á: 2, ǎ: 3, à: 4,
  ē: 1, é: 2, ě: 3, è: 4,
  ī: 1, í: 2, ǐ: 3, ì: 4,
  ō: 1, ó: 2, ǒ: 3, ò: 4,
  ū: 1, ú: 2, ǔ: 3, ù: 4,
  ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4,
  ń: 2, ň: 3, ǹ: 4,
};

export function toneOf(syllable: string): number {
  for (const ch of syllable.normalize('NFC')) {
    const t = TONE_MARKS[ch];
    if (t) return t;
  }
  return 5;
}

export function syllables(pinyin: string): string[] {
  return pinyin.split(/\s+/).filter(Boolean);
}

// Pleco-style tone colors tuned for the LIGHT card face: 1 red, 2 green, 3 blue, 4 purple, neutral gray.
export const TONE_COLORS: Record<number, string> = {
  1: '#E0442C',
  2: '#1B9E4B',
  3: '#2563EB',
  4: '#7C3AED',
  5: '#8A8798',
};

// Brightened variants for DARK backgrounds (sentence lists on bg.base tiles).
export const TONE_COLORS_DARK: Record<number, string> = {
  1: '#FF7A66',
  2: '#4ADE80',
  3: '#60A5FA',
  4: '#C4B5FD',
  5: '#9CA3AF',
};
