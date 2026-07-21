export type ItemType = 'word' | 'chunk' | 'sentence';

export interface DeckItem {
  id: string;
  scenario: string;
  type: ItemType;
  hanzi: string;
  pinyin: string; // tone-marked, space-separated syllables
  gloss: string; // English meaning shown on the card front
  emoji: string; // placeholder visual until generated images land
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
}

export interface Deck {
  lang: string;
  langLabel: string;
  ttsLocale: string;
  scenarios: Scenario[];
  items: DeckItem[];
}
