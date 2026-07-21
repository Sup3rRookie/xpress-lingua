#!/usr/bin/env node
// Dev-only: builds a minimal valid legacy Anki .apkg (schema 11, collection.anki2)
// with 3 Mandarin notes (Hanzi / Pinyin / English fields) and an empty media map,
// so scripts/test-import.js can exercise src/lib/ankiParser.ts end-to-end.
//
// Usage: node scripts/make-test-apkg.js [outFile]
//   default outFile: <os tmpdir>/xpress-lingua-test/test-deck.apkg
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');
const { zipSync, strToU8 } = require('fflate');

const outFile =
  process.argv[2] || path.join(os.tmpdir(), 'xpress-lingua-test', 'test-deck.apkg');

const MID = 1700000000001;
const NOW = Math.floor(Date.now() / 1000);

const MODELS = {
  [MID]: {
    id: MID,
    name: 'Mandarin Basic',
    type: 0,
    mod: NOW,
    usn: -1,
    sortf: 0,
    did: 1,
    flds: [
      { name: 'Hanzi', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
      { name: 'Pinyin', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 },
      { name: 'English', ord: 2, sticky: false, rtl: false, font: 'Arial', size: 20 },
    ],
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '{{Hanzi}}',
        afmt: '{{FrontSide}}<hr id=answer>{{Pinyin}}<br>{{English}}',
      },
    ],
    css: '',
  },
};

// Field values separated by \x1f. Includes HTML, a [sound:] tag and cloze-ish
// markup on purpose so the parser's cleanup path is exercised.
const SEP = '\x1f';
const NOTES = [
  ['你好', 'nǐ hǎo', '<b>hello</b> [sound:hello.mp3]'],
  ['谢谢', 'xiè xie', 'thank&nbsp;you'],
  ['{{c1::再见}}', 'zài jiàn', '<div>goodbye</div>'],
];

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE col (
      id integer primary key, crt integer, mod integer, scm integer, ver integer,
      dty integer, usn integer, ls integer,
      conf text, models text, decks text, dconf text, tags text
    );
  `);
  db.run(`
    CREATE TABLE notes (
      id integer primary key, guid text, mid integer, mod integer, usn integer,
      tags text, flds text, sfld text, csum integer, flags integer, data text
    );
  `);
  // cards table exists in real exports; the parser must ignore it.
  db.run(`
    CREATE TABLE cards (
      id integer primary key, nid integer, did integer, ord integer, mod integer,
      usn integer, type integer, queue integer, due integer, ivl integer,
      factor integer, reps integer, lapses integer, left integer,
      odue integer, odid integer, flags integer, data text
    );
  `);

  db.run('INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [
    1, NOW, NOW, NOW, 11, 0, 0, 0,
    '{}', JSON.stringify(MODELS), '{}', '{}', '{}',
  ]);

  NOTES.forEach((fields, i) => {
    db.run('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)', [
      i + 1, `guid${i + 1}`, MID, NOW, -1, '', fields.join(SEP), fields[0], 0, 0, '',
    ]);
  });

  const dbBytes = db.export();
  db.close();

  const zipped = zipSync({
    'collection.anki2': dbBytes,
    media: strToU8('{}'), // legacy media map with 0 entries
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, zipped);
  console.log(`Wrote ${outFile} (${zipped.length} bytes, ${NOTES.length} notes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
