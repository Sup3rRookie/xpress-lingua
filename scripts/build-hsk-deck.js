// Builds src/data/zh-hsk.json (HSK 1-4 ladder deck) from the community
// complete-hsk-vocabulary dataset (MIT repo; lists labeled "HSK-aligned").
// Usage: node scripts/build-hsk-deck.js <path-to-complete.json>
// IDs are deterministic (level + frequency-sorted index) — do not change the
// sort, or existing learners' FSRS progress detaches from the cards.
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('usage: node scripts/build-hsk-deck.js <path-to-complete.json>');
  process.exit(1);
}

const buildDir = path.join(__dirname, '.content-build');
const { execSync } = require('child_process');
execSync(
  `npx tsc src/data/zh-survival.ts --outDir "${buildDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
  { cwd: path.join(__dirname, '..'), stdio: 'inherit' },
);
const { zhSurvival } = require(path.join(buildDir, 'zh-survival.js'));
const knownHanzi = new Set(zhSurvival.items.map((it) => it.hanzi));

const POS_EMOJI = {
  n: '📦', nz: '🏷️', v: '🏃', a: '🎨', d: '⚡', m: '📏', q: '📏',
  r: '👉', c: '🔗', p: '🧭', u: '✨', t: '⏰', i: '💬', x: '🀄',
};

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const byLevel = { 1: [], 2: [], 3: [], 4: [] };
for (const e of data) {
  const olds = e.level.filter((l) => l.startsWith('old-')).map((l) => Number(l.slice(4)));
  const lvl = Math.min(...olds.filter((n) => n >= 1 && n <= 4));
  if (!Number.isFinite(lvl)) continue;
  if (knownHanzi.has(e.simplified)) continue; // already in the survival deck
  // CC-CEDICT puts obscure senses (surnames, archaic variants) in their own
  // leading forms — pick the form with the most everyday meanings.
  const OBSCURE = /^(surname |old variant|archaic|variant of|\(bound form\)|\(chess\)|\(literary\)|used in )/i;
  const scored = e.forms.map((f) => ({
    form: f,
    everyday: (f.meanings || []).filter((m) => !OBSCURE.test(m)),
  }));
  scored.sort((a, b) => b.everyday.length - a.everyday.length);
  const form = scored[0].form;
  const meanings = scored[0].everyday.length > 0 ? scored[0].everyday : form.meanings;
  byLevel[lvl].push({
    hanzi: e.simplified,
    pinyin: (form.transcriptions.pinyin || '').trim(),
    gloss: meanings.slice(0, 2).join('; ').slice(0, 110),
    emoji: POS_EMOJI[(e.pos && e.pos[0]) || 'x'] || '🀄',
    frequency: e.frequency ?? 999999,
  });
}

const scenarios = [
  { id: 'hsk1', title: 'HSK 1', emoji: '🥉' },
  { id: 'hsk2', title: 'HSK 2', emoji: '🥈' },
  { id: 'hsk3', title: 'HSK 3', emoji: '🥇' },
  { id: 'hsk4', title: 'HSK 4', emoji: '🏆' },
];
const items = [];
for (const lvl of [1, 2, 3, 4]) {
  byLevel[lvl].sort((a, b) => a.frequency - b.frequency || a.pinyin.localeCompare(b.pinyin));
  byLevel[lvl].forEach((w, i) => {
    items.push({
      id: `hsk${lvl}-${String(i).padStart(3, '0')}`,
      scenario: `hsk${lvl}`,
      type: 'word',
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      gloss: w.gloss,
      emoji: w.emoji,
    });
  });
}

const deck = {
  lang: 'zh',
  langLabel: 'Mandarin',
  ttsLocale: 'zh-CN',
  scenarios,
  items,
};
const out = path.join(__dirname, '..', 'src', 'data', 'zh-hsk.json');
fs.writeFileSync(out, JSON.stringify(deck));
console.log(
  'Wrote zh-hsk.json:',
  Object.entries(byLevel).map(([l, w]) => `HSK${l}=${w.length}`).join(' '),
  `total=${items.length} (survival-deck duplicates excluded)`,
);
