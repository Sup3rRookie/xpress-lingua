import zhTravel from '../data/zh-travel-sentences.json';
import jaTravel from '../data/ja-travel-sentences.json';

// Scenario sentence packs, one per language. Shared by the Travel practice screen
// and Episode (listen-and-repeat) mode. Sentence ids carry a per-language prefix
// ("tr-" / "jtr-") so the shared saved list and the audio manifest never collide.

export interface TravelSentence {
  id: string;
  scenario: string;
  hanzi: string;
  pinyin: string;
  gloss: string;
  situation: string;
}

export interface TravelScenario {
  id: string;
  title: string;
  emoji: string;
}

export interface TravelPack {
  lang: string;
  langLabel: string;
  ttsLocale: string;
  scenarios: TravelScenario[];
  sentences: TravelSentence[];
}

const PACKS: Record<string, TravelPack> = {
  zh: zhTravel as TravelPack,
  ja: jaTravel as TravelPack,
};

export function hasTravelPack(lang: string): boolean {
  return Boolean(PACKS[lang]);
}

// Falls back to Mandarin so a caller can never render an undefined pack.
export function travelPack(lang: string): TravelPack {
  return PACKS[lang] ?? PACKS.zh;
}

export function sentencesFor(lang: string, scenario: string): TravelSentence[] {
  return travelPack(lang).sentences.filter((s) => s.scenario === scenario);
}
