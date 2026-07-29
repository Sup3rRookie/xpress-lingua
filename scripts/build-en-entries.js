// Writes scripts/.en-entries.json = [{id, text}] for render-en.py: the English
// meaning of every travel sentence in every language pack. Episode mode speaks
// these between the native line and its slow repeat.
// Clip ids are "g-<sentenceId>" (g for gloss) so they cannot collide with the
// study-language clips, which live under a different audio/<lang>/ folder anyway.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKS = ['zh-travel-sentences.json', 'ja-travel-sentences.json'];

const entries = [];
for (const file of PACKS) {
  const pack = require(path.join(ROOT, 'src', 'data', file));
  for (const s of pack.sentences) entries.push({ id: `g-${s.id}`, text: s.gloss });
}

const seen = new Set();
const out = [];
for (const e of entries) {
  const text = (e.text || '').trim();
  if (!text || seen.has(e.id)) continue;
  seen.add(e.id);
  out.push({ id: e.id, text });
}
fs.writeFileSync(path.join(__dirname, '.en-entries.json'), JSON.stringify(out));
console.log(`en entries: ${out.length} gloss clips from ${PACKS.length} packs`);
