// Builds src/data/zh-travel-sentences.json from the native-vetted fleet output
// (scripts/.travel-raw.json). Dedupes cross-scenario repeats, validates fields,
// assigns stable ids. Audio is TTS-only for now; pre-rendered clips come later.
const fs = require('fs');
const path = require('path');

const SCENARIO_META = {
  arrival: { title: 'Airport & Arrival', emoji: '✈️' },
  taxi: { title: 'Taxi & Getting Around', emoji: '🚕' },
  hotel: { title: 'Hotel & Check-in', emoji: '🏨' },
  food: { title: 'Restaurant & Food', emoji: '🍜' },
  shopping: { title: 'Shopping & Money', emoji: '🛍️' },
  directions: { title: 'Directions', emoji: '🧭' },
  help: { title: 'Emergencies & Help', emoji: '🆘' },
  social: { title: 'Greetings & Small Talk', emoji: '💬' },
};
const ORDER = Object.keys(SCENARIO_META);

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '.travel-raw.json'), 'utf8'));

const seen = new Set();
const bad = [];
const scenarios = [];
const sentences = [];

for (const id of ORDER) {
  const grp = raw.byScenario.find((s) => s.scenario === id);
  if (!grp) continue;
  scenarios.push({ id, ...SCENARIO_META[id] });
  let i = 0;
  for (const s of grp.sentences) {
    const hanzi = (s.hanzi || '').trim();
    const pinyin = (s.pinyin || '').trim();
    const gloss = (s.gloss || '').trim();
    const situation = (s.situation || '').trim();
    // validity
    if (!hanzi || !pinyin || !gloss) {
      bad.push(`missing field: ${JSON.stringify(s)}`);
      continue;
    }
    // dedupe on hanzi across all scenarios (first wins, by scenario order)
    const key = hanzi.replace(/\s/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    sentences.push({
      id: `tr-${id}-${String(i).padStart(2, '0')}`,
      scenario: id,
      hanzi,
      pinyin,
      gloss,
      situation,
    });
    i += 1;
  }
}

const deck = { lang: 'zh', langLabel: 'Mandarin', ttsLocale: 'zh-CN', scenarios, sentences };
fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'zh-travel-sentences.json'),
  JSON.stringify(deck),
);

// quick pinyin sanity: multi-char hanzi should have a space in pinyin
const pinyinOdd = sentences.filter(
  (s) => s.hanzi.replace(/[^一-鿿]/g, '').length >= 2 && !/\s/.test(s.pinyin),
);
console.log(
  `travel-sentences: ${scenarios.length} scenarios, ${sentences.length} sentences ` +
    `(deduped from ${raw.all.length}), ${bad.length} dropped for missing fields, ` +
    `${pinyinOdd.length} pinyin-format warnings`,
);
if (bad.length) bad.slice(0, 5).forEach((b) => console.log('  DROP', b));
if (pinyinOdd.length) pinyinOdd.slice(0, 5).forEach((s) => console.log('  PINYIN?', s.hanzi, '|', s.pinyin));
