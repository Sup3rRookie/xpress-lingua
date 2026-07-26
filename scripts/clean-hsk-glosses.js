// Rewrites the glosses in src/data/zh-hsk.json to be learner-friendly:
// "balanced" style, up to two clean meanings, jargon/dialect/domain notes and
// absurd senses removed. Two layers:
//   1) a deterministic cleaner for the long tail of content words, and
//   2) a curated override map for grammar particles, pronouns, and common words
//      whose raw dictionary lead sense is wrong or noisy for a beginner.
// Card ids/hanzi/pinyin are untouched, so FSRS progress is unaffected.
// Usage: node scripts/clean-hsk-glosses.js
const fs = require('fs');
const path = require('path');

// Hand-written, learner-first glosses. Particles get a short grammar note in
// parentheses; everything else is one or two plain meanings.
const OVERRIDES = {
  // particles & structural words
  的: "(possessive) 's; of",
  了: '(marks a completed action or a change of state)',
  是: 'to be; is',
  在: 'to be at; located in',
  不: 'not; no',
  没: 'not; have not',
  有: 'to have; there is',
  个: '(general classifier)',
  和: 'and; with',
  跟: 'with; and',
  把: 'to hold; (marks the object)',
  被: 'by (passive marker); quilt',
  这: 'this; these',
  那: 'that; those',
  呢: '(question / continuation particle)',
  吧: '(suggestion or assumption particle)',
  吗: '(yes-no question particle)',
  啊: '(exclamation particle)',
  呀: '(exclamation particle)',
  嘛: '(particle: stating the obvious)',
  啦: '(particle blending 了 and 啊)',
  着: '(marks an ongoing action or state)',
  过: '(marks a past experience); to pass',
  得: '(marks degree or result); to have to',
  地: '(adverbial particle, like -ly)',
  就: 'then; just; right away',
  才: 'only then; just now',
  又: 'again; also',
  再: 'again; once more',
  只: 'only; merely',
  更: 'more; even more',
  还: 'still; also',
  都: 'all; both',
  很: 'very',
  太: 'too; excessively',
  最: 'most; the -est',
  别: "don't; other",
  起来: '(marks a beginning); to get up',
  下来: '(marks completion); to come down',
  出来: '(marks emergence); to come out',
  一下: '(do briefly); once',
  些: 'some; a few',
  老: 'old; (friendly prefix for a person)',
  的话: '(if ...); as for',
  // pronouns & question words
  我: 'I; me',
  你: 'you',
  您: 'you (polite)',
  他: 'he; him',
  她: 'she; her',
  它: 'it',
  我们: 'we; us',
  你们: 'you (plural)',
  他们: 'they; them',
  她们: 'they; them (female)',
  咱们: 'we; us (including you)',
  自己: 'oneself; one’s own',
  别人: 'other people; others',
  大家: 'everyone',
  谁: 'who; whom',
  什么: 'what',
  哪: 'which',
  哪儿: 'where',
  哪里: 'where',
  怎么: 'how; why',
  怎么样: 'how about; how is it',
  为什么: 'why',
  多少: 'how much; how many',
  // common verbs & modals
  会: 'can; will',
  能: 'can; to be able to',
  要: 'to want; must; will',
  想: 'to want; to think; to miss',
  可以: 'can; may',
  应该: 'should; ought to',
  让: 'to let; to make (someone do)',
  给: 'to give; for',
  用: 'to use',
  需要: 'to need; to require',
  喜欢: 'to like',
  爱: 'to love',
  知道: 'to know',
  认识: 'to know (someone); to recognize',
  觉得: 'to feel; to think',
  希望: 'to hope; hope',
  帮助: 'to help; help',
  介绍: 'to introduce',
  决定: 'to decide; decision',
  // conjunctions & connectors
  如果: 'if; in case',
  因为: 'because',
  所以: 'so; therefore',
  但是: 'but; however',
  可是: 'but; however',
  虽然: 'although',
  然后: 'then; afterward',
  或者: 'or',
  而且: 'moreover; and',
  // common content words with noisy raw glosses
  机场: 'airport',
  字典: 'dictionary (of characters)',
  词典: 'dictionary',
  词语: 'word; term',
  规定: 'to stipulate; regulations',
  受到: 'to receive; to suffer',
  解决: 'to solve; to settle',
  厉害: 'impressive; severe',
  比: 'to compare; than (in comparisons)',
  东西: 'thing; stuff',
  意思: 'meaning; intention',
  地方: 'place; area',
  时候: 'time; moment',
  // pure measure words (no plain meaning to fall back on) + fraction marker
  分之: '(marks a fraction)',
  辆: '(classifier for vehicles)',
  份: '(classifier for a portion or copy)',
  棵: '(classifier for plants and trees)',
  岁: 'years of age',
  次: '(measure word for times / occurrences)',
  张: '(classifier for flat things); to open',
  朵: '(classifier for flowers and clouds)',
  趟: '(measure word for trips)',
  顿: '(measure word for meals)',
  // words where the raw dictionary led with a rare/archaic/homograph sense
  年: 'year',
  告诉: 'to tell; to inform',
  热: 'hot',
  上: 'above, on; to go up',
  故事: 'story; tale',
  等: 'to wait; and so on',
  妻子: 'wife',
  干: 'to do; dry',
  关: 'to close; to turn off',
  胖: 'fat; plump',
  云: 'cloud',
  夏: 'summer',
  冬: 'winter',
  咸: 'salty',
  狮子: 'lion',
  教: 'to teach',
  修: 'to repair; to fix',
  打印: 'to print',
  之: '(literary) of; it',
  挺: 'quite; very',
  往: 'toward; to go',
  块: 'piece; yuan (money)',
  // color/animal/season words whose raw second sense was slang
  黄: 'yellow',
  绿: 'green',
  春: 'spring (season)',
  猫: 'cat',
  叶子: 'leaf',
  沙发: 'sofa; couch',
  马: 'horse',
  旧: 'old; used',
  血: 'blood',
  父亲: 'father',
  母亲: 'mother',
};

// A handful of pinyin that were wrong in the source data (independent of gloss).
// Changing pinyin is display-only (card ids are index-based, audio keys off id),
// so FSRS progress is unaffected.
const PINYIN_FIX = {
  没: 'méi',
  着: 'zhe',
  妻子: 'qī zi',
  胖: 'pàng',
  趟: 'tàng',
  狮子: 'shī zi',
};

function cleanGloss(raw) {
  const senses = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let s of senses) {
    // Drop parenthetical notes and {template} braces (raw dictionary noise),
    // and expand the sb/sth shorthand into plain words.
    s = s
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\bsb\.?\b/gi, 'someone')
      .replace(/\bsth\.?\b/gi, 'something')
      .replace(/\s+/g, ' ')
      .trim();
    // Trim trailing "etc" and stray punctuation.
    s = s.replace(/,?\s*etc\.?$/i, '').replace(/^[,;:.\s]+|[,;:.\s]+$/g, '').trim();
    if (!s) continue;
    // Skip senses that are pure grammar/usage notes rather than a meaning.
    if (/^(used\b|prefix\b|particle\b|classifier\b|onomatopoeia|abbr\.|see\b|variant\b|surname\b|specifier\b|measure word)/i.test(s))
      continue;
    // Skip garbled "to be ...ed" style fragments left after stripping parens.
    if (/\.\.\./.test(s)) continue;
    out.push(s);
    if (out.length >= 2) break;
  }
  let g = out.join('; ');
  if (g.length > 62) g = g.slice(0, 62).replace(/[,;\s]+\S*$/, '');
  return g;
}

function main() {
  const file = path.join(__dirname, '..', 'src', 'data', 'zh-hsk.json');
  const deck = JSON.parse(fs.readFileSync(file, 'utf8'));
  let overridden = 0;
  let cleaned = 0;
  let unchanged = 0;
  let emptied = 0;
  for (const it of deck.items) {
    const before = it.gloss;
    if (OVERRIDES[it.hanzi]) {
      it.gloss = OVERRIDES[it.hanzi];
      overridden++;
    } else {
      const g = cleanGloss(before);
      // Never ship an empty gloss: keep a trimmed original if cleaning wiped it.
      it.gloss = g || before.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 62);
      if (!g) emptied++;
    }
    if (it.gloss !== before) cleaned++;
    else unchanged++;
    if (PINYIN_FIX[it.hanzi]) it.pinyin = PINYIN_FIX[it.hanzi];
  }
  fs.writeFileSync(file, JSON.stringify(deck));
  console.log(
    `HSK glosses: ${overridden} curated, ${cleaned} total changed, ${unchanged} unchanged, ${emptied} clean-fallbacks`,
  );
}

main();
