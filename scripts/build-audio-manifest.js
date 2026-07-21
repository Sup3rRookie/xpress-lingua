// Scans public/audio/<lang>/ for rendered clips and writes manifest.json there,
// which the app fetches to know which ids have real audio (vs TTS fallback).
// Run after any render: node scripts/build-audio-manifest.js
const fs = require('fs');
const path = require('path');

const audioRoot = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(audioRoot)) {
  console.log('no public/audio directory — nothing to do');
  process.exit(0);
}
for (const lang of fs.readdirSync(audioRoot)) {
  const dir = path.join(audioRoot, lang);
  if (!fs.statSync(dir).isDirectory()) continue;
  const files = {};
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+)\.(mp3|wav|ogg)$/);
    if (m) files[m[1]] = f; // mp3 wins over wav when both exist (later overwrite ok)
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ files }, null, 1));
  console.log(`${lang}: ${Object.keys(files).length} clips in manifest`);
}
