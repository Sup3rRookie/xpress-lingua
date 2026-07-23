export type ItemType = 'word' | 'chunk' | 'sentence';

export interface DeckItem {
  id: string;
  scenario: string;
  type: ItemType;
  hanzi: string; // target phrase (any language, named for the original Mandarin deck)
  // Pronunciation line. For zh decks: tone-marked, space-separated pinyin syllables
  // (tone-colored at render time). Imported decks put their reading/pronunciation
  // field here too; may be '' when the source deck has none.
  pinyin: string;
  gloss: string; // meaning/translation shown on the card front
  emoji?: string; // placeholder visual until generated images land (🃏 fallback)
  audioKey?: string; // key into the imported-media store (`${deckId}/${filename}`)
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
