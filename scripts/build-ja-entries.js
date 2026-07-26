// Writes scripts/.ja-entries.json = [{id, text}] for render-ja.py: the survival
// deck, the JLPT ladder words, and the JLPT example sentences. Clip ids match
// what the app requests via playText: survival/JLPT item ids as-is, examples
// prefixed "jae-" (see exampleFor in src/lib/sentences.ts).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const buildDir = path.join(__dirname, '.content-build');
execSync(
  `npx tsc src/data/ja-survival.ts --outDir "${buildDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
  { cwd: ROOT, stdio: 'inherit' },
);
const { jaSurvival } = require(path.join(buildDir, 'ja-survival.js'));
const jlpt = require(path.join(ROOT, 'src', 'data', 'ja-jlpt.json'));
const ex = require(path.join(ROOT, 'src', 'data', 'ja-jlpt-examples.json'));

const entries = [];
for (const it of jaSurvival.items) entries.push({ id: it.id, text: it.hanzi });
for (const it of jlpt.items) entries.push({ id: it.id, text: it.hanzi });
for (const [k, v] of Object.entries(ex)) entries.push({ id: 'jae-' + k, text: v.hanzi });

const seen = new Set();
const out = [];
for (const e of entries) {
  if (!e.text || !e.text.trim() || seen.has(e.id)) continue;
  seen.add(e.id);
  out.push({ id: e.id, text: e.text.trim() });
}
fs.writeFileSync(path.join(__dirname, '.ja-entries.json'), JSON.stringify(out));
console.log(
  `ja entries: ${out.length} (survival ${jaSurvival.items.length} + jlpt ${jlpt.items.length} + examples ${Object.keys(ex).length})`,
);
