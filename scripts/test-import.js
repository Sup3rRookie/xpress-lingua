#!/usr/bin/env node
// Dev-only: end-to-end check of the .apkg parser OUTSIDE React Native.
// Compiles src/lib/ankiParser.ts (platform-agnostic) to CommonJS in a temp dir,
// then runs parseApkg / guessMapping / buildDeckItems against a real .apkg file.
//
// Usage: node scripts/test-import.js [apkgFile]
//   default apkgFile: <os tmpdir>/xpress-lingua-test/test-deck.apkg
//   (create it first with: node scripts/make-test-apkg.js)
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');

const projectRoot = path.join(__dirname, '..');
const apkgFile =
  process.argv[2] || path.join(os.tmpdir(), 'xpress-lingua-test', 'test-deck.apkg');
// Build inside the project so the compiled file can resolve node_modules.
const buildDir = path.join(projectRoot, 'scripts', '.parser-build');

function compileParser() {
  fs.rmSync(buildDir, { recursive: true, force: true });
  const win = process.platform === 'win32';
  const args = [
    'tsc',
    path.join('src', 'lib', 'ankiParser.ts'),
    '--ignoreConfig', // TS 6: don't mix the app tsconfig with this one-off build
    '--outDir', buildDir,
    // node16 emits CommonJS here (package.json has no "type": "module")
    '--module', 'node16',
    '--target', 'es2020',
    '--moduleResolution', 'node16',
    '--esModuleInterop',
    '--skipLibCheck',
  ];
  execFileSync(
    win ? 'npx.cmd' : 'npx',
    // Windows runs through a shell, so quote args that may contain spaces.
    win ? args.map((a) => (a.includes(' ') ? `"${a}"` : a)) : args,
    { cwd: projectRoot, stdio: 'inherit', shell: win },
  );
  return require(path.join(buildDir, 'lib', 'ankiParser.js'));
}

async function main() {
  if (!fs.existsSync(apkgFile)) {
    console.error(`No apkg at ${apkgFile} — run: node scripts/make-test-apkg.js`);
    process.exit(1);
  }

  console.log('Compiling src/lib/ankiParser.ts …');
  const parser = compileParser();

  const bytes = new Uint8Array(fs.readFileSync(apkgFile));
  const SQL = await initSqlJs();

  console.log(`\nParsing ${apkgFile} (${bytes.length} bytes)`);
  const parsed = parser.parseApkg(bytes, SQL);

  console.log(`Note type: ${parsed.noteTypeName}`);
  console.log(`Notes:     ${parsed.totalNotes}`);
  if (parsed.skippedNoteTypes.length) {
    console.log(
      `Skipped:   ${parsed.skippedNoteTypes.map((t) => `${t.name} (${t.count})`).join(', ')}`,
    );
  }
  console.log(`Media:     ${parsed.mediaFilenames.length} file(s)`);
  console.log('Fields:');
  for (const f of parsed.fields) {
    console.log(
      `  [${f.index}] ${f.name}  sound:${f.soundCount}  samples: ${f.samples.join(' · ')}`,
    );
  }

  const mapping = parser.guessMapping(
    parsed.fields,
    Math.min(parsed.totalNotes, parser.SAMPLE_NOTES),
  );
  console.log('\nGuessed mapping:', mapping);

  const built = parser.buildDeckItems(parsed, mapping, 'test-deck');
  console.log(
    `\nBuilt ${built.importedCount}/${built.totalNotes} items` +
      (built.capped ? ' (capped at 1000)' : '') +
      `, ${built.audio.length} audio file(s) referenced:`,
  );
  console.log(JSON.stringify(built.items, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
