// One-off: remove em dashes from source. UI/logic files get a full sweep
// (all their em dashes are English prose or comments). Data files are handled
// separately so Chinese punctuation in hanzi fields is never touched.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

// Exact-phrase replacements for user-visible strings that read better with
// specific punctuation than a blanket comma.
const PHRASE = [
  ['✨ NEW — listen first, then copy it', '✨ NEW. Listen first, then copy it'],
  ['I said it — flip', 'I said it, flip'],
  ['🚀 Keep going — more new cards', '🚀 Keep going for more'],
  ['🚀 Pace done — keep going', '🚀 Pace done, keep going'],
  ['👂 Listening — say it!', '👂 Listening, say it!'],
  ['Listen, then say it out loud — match the pitch shape, not just the sounds.',
    'Listen, then say it out loud. Match the pitch shape, not just the sounds.'],
  ['— none —', '(none)'],
  ['— None —', 'None'],
  ['${score}% — close', 'Close (${score}%)'],
  ['${score}% — listen again', 'Listen again (${score}%)'],
];

// Any remaining " — " in these files becomes ", " (grammatical and human).
function sweep(text) {
  for (const [a, b] of PHRASE) text = text.split(a).join(b);
  text = text.split(' — ').join(', ');
  text = text.split('—').join('-'); // stray em dashes in comments
  return text;
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    // Data decks with Chinese content are handled by fix-emdash-data.js.
    if (/[\\/]data[\\/]/.test(p) && /(survival|sentences|hsk)\.ts$/.test(name)) continue;
    const before = fs.readFileSync(p, 'utf8');
    if (!before.includes('—')) continue;
    const after = sweep(before);
    if (after !== before) {
      fs.writeFileSync(p, after);
      console.log('swept', path.relative(SRC, p));
    }
  }
}

walk(SRC);
console.log('done');
