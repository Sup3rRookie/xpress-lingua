// Exports every built-in phrase + sentence to content/zh-manifest.json —
// the single input consumed by all TTS render pipelines (local MeloTTS,
// Colab Qwen3-TTS). Run: node scripts/export-manifest.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(__dirname, '.content-build');

execSync(
  `npx tsc src/data/zh-survival.ts src/data/zh-sentences.ts --outDir "${buildDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
  { cwd: root, stdio: 'inherit' },
);

const { zhSurvival } = require(path.join(buildDir, 'zh-survival.js'));
const { ZH_SENTENCES } = require(path.join(buildDir, 'zh-sentences.js'));
const zhHsk = require(path.join(root, 'src', 'data', 'zh-hsk.json'));

const entries = [
  ...zhSurvival.items.map((it) => ({ id: it.id, text: it.hanzi })),
  ...ZH_SENTENCES.map((s) => ({ id: s.id, text: s.hanzi })),
  ...zhHsk.items.map((it) => ({ id: it.id, text: it.hanzi })),
];

const outDir = path.join(root, 'content');
fs.mkdirSync(outDir, { recursive: true });
const manifest = { lang: 'zh', format: 'mp3', generatedAt: null, entries };
fs.writeFileSync(path.join(outDir, 'zh-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote content/zh-manifest.json — ${entries.length} entries`);
