import { zhSurvival } from '../data/zh-survival';
import { SentenceEntry, SentencePattern, ZH_PATTERNS, ZH_SENTENCES } from '../data/zh-sentences';
// Real Tatoeba sentences (CC-BY, attribution preserved) matched per HSK word.
import hskExamples from '../data/zh-hsk-examples.json';

const ITEM_BY_ID = new Map(zhSurvival.items.map((it) => [it.id, it]));

interface HskExample {
  hanzi: string;
  pinyin: string;
  gloss: string;
  attribution?: string; // Tatoeba CC-BY entries carry it; authored originals don't
}
const HSK_EXAMPLES = hskExamples as Record<string, HskExample>;

export interface Example {
  id: string; // audio clip id
  hanzi: string;
  pinyin: string;
  gloss: string;
  attribution?: string;
}

// Sentences whose every component word has been met.
export function unlockedSentences(metIds: Set<string>): SentenceEntry[] {
  return ZH_SENTENCES.filter((s) => s.itemIds.every((id) => metIds.has(id)));
}

// Example sentence for a card back: curated survival sentence first,
// then the word's matched Tatoeba sentence (HSK deck).
export function exampleFor(itemId: string): Example | undefined {
  const curated = ZH_SENTENCES.find((s) => s.itemIds.includes(itemId));
  if (curated) return curated;
  const hsk = HSK_EXAMPLES[itemId];
  return hsk ? { id: `hske-${itemId}`, ...hsk } : undefined;
}

export interface GeneratedSentence {
  id: string;
  hanzi: string;
  pinyin: string;
  gloss: string;
}

function fill(template: string, values: string[]): string {
  return template.replace(/\{(\d)\}/g, (_, i) => values[Number(i)] ?? '');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Substitution drill: fill each pattern's slots with random LEARNED words only,
// so every generated sentence is guaranteed natural and fully readable.
export function generateSentences(metIds: Set<string>, count: number): GeneratedSentence[] {
  const usable: SentencePattern[] = ZH_PATTERNS.filter((p) =>
    p.slots.every((slot) => slot.some((id) => metIds.has(id))),
  );
  const out: GeneratedSentence[] = [];
  let round = 0;
  while (out.length < count && usable.length > 0 && round < count * 3) {
    round += 1;
    const p = usable[round % usable.length];
    const chosen: string[] = [];
    let ok = true;
    for (const slot of p.slots) {
      const eligible = slot.filter(
        (id) => metIds.has(id) && (!p.distinctSlots || !chosen.includes(id)),
      );
      if (eligible.length === 0) {
        ok = false;
        break;
      }
      chosen.push(shuffle(eligible)[0]);
    }
    if (!ok) continue;
    const items = chosen.map((id) => ITEM_BY_ID.get(id)!);
    const sentence: GeneratedSentence = {
      id: `${p.id}-${chosen.join('-')}`,
      hanzi: fill(p.hanzi, items.map((it) => it.hanzi)),
      pinyin: fill(p.pinyin, items.map((it) => it.pinyin)),
      gloss: fill(p.gloss, items.map((it) => it.gloss)),
    };
    if (!out.some((s) => s.id === sentence.id)) out.push(sentence);
  }
  return out;
}
