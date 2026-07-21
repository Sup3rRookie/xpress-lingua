import { zhSurvival } from '../data/zh-survival';
import { SentenceEntry, SentencePattern, ZH_PATTERNS, ZH_SENTENCES } from '../data/zh-sentences';

const ITEM_BY_ID = new Map(zhSurvival.items.map((it) => [it.id, it]));

// Sentences whose every component word has been met.
export function unlockedSentences(metIds: Set<string>): SentenceEntry[] {
  return ZH_SENTENCES.filter((s) => s.itemIds.every((id) => metIds.has(id)));
}

// First example sentence that uses this item (shown on card backs).
export function exampleFor(itemId: string): SentenceEntry | undefined {
  return ZH_SENTENCES.find((s) => s.itemIds.includes(itemId));
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
