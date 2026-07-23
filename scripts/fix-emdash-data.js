// Removes em dashes from ENGLISH gloss text in deck data only. Chinese hanzi
// fields keep their punctuation (and stay in sync with pre-rendered audio).
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '..', 'src', 'data');

function fixGloss(s) {
  return s.split('? — ').join('? ').split(' — ').join(', ').split('—').join('-');
}

// zh-examples-authored.json: fix only the "gloss" field of each entry.
const jf = path.join(D, 'zh-examples-authored.json');
const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
for (const k of Object.keys(data)) {
  if (data[k].gloss) data[k].gloss = fixGloss(data[k].gloss);
}
fs.writeFileSync(jf, JSON.stringify(data, null, 2) + '\n');
console.log('fixed zh-examples-authored.json glosses');

// zh-sentences.ts: fix em dashes inside gloss: "..." / gloss: '...' only.
const tf = path.join(D, 'zh-sentences.ts');
let ts = fs.readFileSync(tf, 'utf8');
ts = ts.replace(/gloss:\s*(['"])((?:\\.|(?!\1).)*)\1/g, (m, q, body) =>
  `gloss: ${q}${fixGloss(body)}${q}`,
);
fs.writeFileSync(tf, ts);
console.log('fixed zh-sentences.ts glosses');
