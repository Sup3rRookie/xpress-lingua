import { zhSurvival } from '../data/zh-survival';
import { zhHsk } from '../data/zh-hsk';
import { SentenceEntry, SentencePattern, ZH_PATTERNS, ZH_SENTENCES } from '../data/zh-sentences';
// Real Tatoeba sentences (CC-BY, attribution preserved) matched per word.
import hskExamples from '../data/zh-hsk-examples.json';
import jaExamples from '../data/ja-jlpt-examples.json';

const ITEM_BY_ID = new Map([...zhSurvival.items, ...zhHsk.items].map((it) => [it.id, it]));

// HSK deck emoji encodes part of speech (build-hsk-deck.js): nouns and verbs
// can fill open sentence frames, EXCEPT function words that break naturalness
// (copulas, auxiliaries, abstract nouns: "我想是。" is nonsense).
const VERB_BLOCK = new Set([
  '是', '有', '会', '能', '要', '想', '在', '让', '给', '被', '把', '得',
  '应该', '觉得', '像', '使', '属于', '如', '为', '成为', '算', '当', '值得',
  '认识', '知道', '明白', '懂', '同意', '记得', '忘记', '希望', '需要',
  '感到', '感觉', '发现', '表示', '存在', '包括', '受到', '引起', '进行',
]);
const NOUN_BLOCK = new Set([
  '时候', '东西', '事情', '问题', '方面', '情况', '关系', '意思', '样子',
  '地方', '时间', '原因', '结果', '内容', '部分', '方法', '条件', '过程',
  '儿子', '女儿', '爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹', '丈夫',
  '妻子', '先生', '太太', '孩子', '朋友', '同事', '同学', '邻居', '师傅',
]);
// Frames only draw from HSK 1-2: levels 3-4 are too abstract for blind slot
// filling ("我想失败" = "I want to fail" is grammatical nonsense).
const FRAME_LEVELS = new Set(['hsk1', 'hsk2']);
const HSK_NOUN_IDS = zhHsk.items
  .filter(
    (it) =>
      FRAME_LEVELS.has(it.scenario) && it.emoji === '📦' && !NOUN_BLOCK.has(it.hanzi),
  )
  .map((it) => it.id);
// Single-char verbs are often bound forms needing an object (回, 出, 进):
// only whitelisted ones may stand alone in a frame.
const SINGLE_VERB_OK = new Set([
  '去', '说', '吃', '喝', '看', '听', '买', '卖', '学', '写', '读', '玩',
  '坐', '走', '睡', '唱', '跳', '笑', '哭', '问', '试',
]);
const HSK_VERB_IDS = zhHsk.items
  .filter(
    (it) =>
      FRAME_LEVELS.has(it.scenario) &&
      it.emoji === '🏃' &&
      !VERB_BLOCK.has(it.hanzi) &&
      (it.hanzi.length >= 2 || SINGLE_VERB_OK.has(it.hanzi)),
  )
  .map((it) => it.id);

// First meaning only, minus a leading "to ", so frames read naturally.
// Verb frames prefer a "to X" sense (帮助 lists "assistance" before "to help").
function shortGloss(gloss: string, preferVerb = false): string {
  const senses = gloss.split(';').map((s) => s.trim());
  let pick = senses[0];
  if (preferVerb) {
    pick = senses.find((s) => s.startsWith('to ')) ?? pick;
  }
  return pick
    .replace(/^to /, '')
    .replace(/^\(.*?\)\s*/, '')
    .replace(/\s+(to|at|in|on|for|of|with)$/, '')
    .trim();
}

interface HskExample {
  hanzi: string;
  pinyin: string;
  gloss: string;
  attribution?: string; // Tatoeba CC-BY entries carry it; authored originals don't
}
const HSK_EXAMPLES = hskExamples as Record<string, HskExample>;
const JA_EXAMPLES = jaExamples as Record<string, HskExample>;

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

// Example sentence for a card back: curated Mandarin survival sentence first,
// then the word's matched Tatoeba sentence (HSK words, then JLPT words).
// JLPT examples have no pre-rendered clip, so their id has no matching audio
// file and playback falls back to TTS.
export function exampleFor(itemId: string): Example | undefined {
  const curated = ZH_SENTENCES.find((s) => s.itemIds.includes(itemId));
  if (curated) return curated;
  const hsk = HSK_EXAMPLES[itemId];
  if (hsk) return { id: `hske-${itemId}`, ...hsk };
  const ja = JA_EXAMPLES[itemId];
  return ja ? { id: `jae-${itemId}`, ...ja } : undefined;
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
  // Learned HSK vocabulary widens the frames: nouns join the like/dislike
  // patterns, verbs get their own "I want to X" frame.
  const learnedNouns = HSK_NOUN_IDS.filter((id) => metIds.has(id));
  const learnedVerbs = HSK_VERB_IDS.filter((id) => metIds.has(id));
  const patterns: SentencePattern[] = ZH_PATTERNS.map((p) =>
    p.id === 'zp-06' || p.id === 'zp-07'
      ? { ...p, slots: [[...p.slots[0], ...learnedNouns]] }
      : p,
  );
  if (learnedVerbs.length > 0) {
    patterns.push({
      id: 'zp-hv',
      hanzi: '我想{0}。',
      pinyin: 'wǒ xiǎng {0}',
      gloss: 'I want to {0}.',
      slots: [learnedVerbs],
    });
    patterns.push({
      id: 'zp-hv2',
      hanzi: '我们一起{0}吧。',
      pinyin: 'wǒ men yì qǐ {0} ba',
      gloss: "let's {0} together.",
      slots: [learnedVerbs],
    });
  }
  const usable: SentencePattern[] = patterns.filter((p) =>
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
      gloss: fill(
        p.gloss,
        items.map((it) => shortGloss(it.gloss, p.id === 'zp-hv' || p.id === 'zp-hv2')),
      ),
    };
    if (!out.some((s) => s.id === sentence.id)) out.push(sentence);
  }
  return out;
}
