// Builds src/data/ja-travel-sentences.json from the native-vetted fleet output
// (scripts/.ja-travel-raw/<scenario>.json, one file per scenario). Dedupes
// cross-scenario repeats, validates fields, assigns stable ids. Mirrors
// build-travel-sentences.js (Mandarin) so both packs share one shape.
// Ids are prefixed "jtr-" so they can never collide with the Mandarin "tr-" ids
// in the shared saved-list or the audio manifest.
const fs = require('fs');
const path = require('path');

const SCENARIO_META = {
  arrival: { title: 'Airport & Arrival', emoji: '✈️' },
  taxi: { title: 'Trains & Taxis', emoji: '🚄' },
  hotel: { title: 'Hotel & Check-in', emoji: '🏨' },
  food: { title: 'Restaurant & Food', emoji: '🍜' },
  shopping: { title: 'Shopping & Money', emoji: '🛍️' },
  directions: { title: 'Directions', emoji: '🧭' },
  help: { title: 'Emergencies & Help', emoji: '🆘' },
  social: { title: 'Greetings & Small Talk', emoji: '💬' },
};
const ORDER = Object.keys(SCENARIO_META);
const RAW_DIR = path.join(__dirname, '.ja-travel-raw');
// Corrections from the native-speaker review pass, applied after assembly.
const FIXES = JSON.parse(fs.readFileSync(path.join(__dirname, 'ja-travel-fixes.json'), 'utf8'));

const seen = new Set();
const bad = [];
const scenarios = [];
const sentences = [];
let rawCount = 0;

for (const id of ORDER) {
  const file = path.join(RAW_DIR, `${id}.json`);
  if (!fs.existsSync(file)) {
    // Continuing would silently drop a whole scenario while its ids stay claimed
    // by already-rendered clips.
    console.error(`build failed: missing scenario file ${id}.json`);
    process.exit(1);
  }
  const grp = JSON.parse(fs.readFileSync(file, 'utf8'));
  rawCount += grp.length;
  scenarios.push({ id, ...SCENARIO_META[id] });
  let i = 0;
  for (const s of grp) {
    const hanzi = (s.hanzi || '').trim();
    const pinyin = (s.pinyin || '').trim();
    const gloss = (s.gloss || '').trim();
    const situation = (s.situation || '').trim();
    if (!hanzi || !pinyin || !gloss) {
      bad.push(`missing field: ${JSON.stringify(s)}`);
      continue;
    }
    const key = hanzi.replace(/\s/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    sentences.push({
      id: `jtr-${id}-${String(i).padStart(2, '0')}`,
      scenario: id,
      hanzi,
      pinyin,
      gloss,
      situation,
    });
    i += 1;
  }
}

// Apply the native-review corrections. Keys starting with "_" are documentation.
let applied = 0;
const unknownFix = [];
for (const [id, fix] of Object.entries(FIXES)) {
  if (id.startsWith('_')) continue;
  if (typeof fix !== 'object' || Array.isArray(fix)) continue;
  const s = sentences.find((x) => x.id === id);
  if (!s) {
    unknownFix.push(id);
    continue;
  }
  for (const [k, v] of Object.entries(fix)) {
    if (!k.startsWith('_')) s[k] = v;
  }
  applied += 1;
}

// Append the lines the review found missing. Ids continue after the highest
// existing index in that scenario, so no existing id (or its rendered clip) moves.
let added = 0;
for (const [scenarioId, extras] of Object.entries(FIXES._add ?? {})) {
  if (!SCENARIO_META[scenarioId]) {
    console.log(`  ADD FOR UNKNOWN SCENARIO: ${scenarioId}`);
    continue;
  }
  let next =
    sentences.filter((s) => s.scenario === scenarioId).length === 0
      ? 0
      : Math.max(
          ...sentences
            .filter((s) => s.scenario === scenarioId)
            .map((s) => Number(s.id.slice(s.id.lastIndexOf('-') + 1))),
        ) + 1;
  for (const e of extras) {
    const key = e.hanzi.replace(/\s/g, '');
    if (seen.has(key)) {
      console.log(`  ADD SKIPPED (already present): ${e.hanzi}`);
      continue;
    }
    seen.add(key);
    sentences.push({
      id: `jtr-${scenarioId}-${String(next).padStart(2, '0')}`,
      scenario: scenarioId,
      hanzi: e.hanzi,
      pinyin: e.pinyin,
      gloss: e.gloss,
      situation: e.situation ?? '',
    });
    next += 1;
    added += 1;
  }
}
// Keep each scenario's lines together and in id order after the appends.
sentences.sort(
  (a, b) => ORDER.indexOf(a.scenario) - ORDER.indexOf(b.scenario) || a.id.localeCompare(b.id),
);

// Romaji is a pronunciation scaffold, so keep it free of sentence-final periods
// (some scenarios came back with them, some without).
for (const s of sentences) s.pinyin = s.pinyin.replace(/\s*[.。]\s*$/, '').trim();

// Fixes and additions are applied after the initial dedupe, so a rewrite can
// collide with another line. Catch that here rather than shipping two identical
// cards with two identical clips.
const byText = {};
for (const s of sentences) (byText[s.hanzi] ??= []).push(s.id);
const dupes = Object.entries(byText).filter(([, ids]) => ids.length > 1);
const byId = {};
for (const s of sentences) (byId[s.id] ??= []).push(s.hanzi);
const dupeIds = Object.entries(byId).filter(([, texts]) => texts.length > 1);
if (dupes.length || dupeIds.length) {
  dupes.forEach(([h, ids]) => console.error(`  DUPLICATE TEXT: ${h} -> ${ids.join(', ')}`));
  dupeIds.forEach(([id, texts]) => console.error(`  DUPLICATE ID: ${id} -> ${texts.join(' | ')}`));
  console.error('build failed: duplicate sentences');
  process.exit(1);
}

const deck = { lang: 'ja', langLabel: 'Japanese', ttsLocale: 'ja-JP', scenarios, sentences };
fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'ja-travel-sentences.json'),
  JSON.stringify(deck),
);

// Sanity: the reading should be romaji (latin), and a sentence with several
// Japanese characters should have spaces between words.
const romajiOdd = sentences.filter((s) => /[ぁ-んァ-ヶ一-鿿]/.test(s.pinyin));
const spaceOdd = sentences.filter(
  (s) => s.hanzi.replace(/[^ぁ-んァ-ヶ一-鿿]/g, '').length >= 4 && !/\s/.test(s.pinyin),
);
console.log(
  `ja-travel-sentences: ${scenarios.length} scenarios, ${sentences.length} sentences ` +
    `(deduped from ${rawCount}), ${bad.length} dropped for missing fields, ` +
    `${applied} native-review fixes applied, ${added} lines added, ` +
    `${romajiOdd.length} non-romaji readings, ${spaceOdd.length} spacing warnings`,
);
if (unknownFix.length) {
  // A mistyped id means a native-speaker correction silently did not apply.
  console.error('build failed: fix for unknown id:', unknownFix.join(', '));
  process.exit(1);
}
if (bad.length) bad.slice(0, 5).forEach((b) => console.log('  DROP', b));
if (romajiOdd.length) romajiOdd.slice(0, 5).forEach((s) => console.log('  KANA?', s.hanzi, '|', s.pinyin));
if (spaceOdd.length) spaceOdd.slice(0, 5).forEach((s) => console.log('  SPACING?', s.hanzi, '|', s.pinyin));
