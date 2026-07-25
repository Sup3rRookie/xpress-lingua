import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';
import type { SqlJsStatic } from 'sql.js';

// sql.js WASM loading (web). The .wasm binary matching the bundled JS is served
// from public/sql-wasm-browser.wasm. It must be resolved RELATIVE to the app's
// base URL: on GitHub Pages the app lives under /xpress-lingua/, so a leading-
// slash absolute path would 404 and (previously) fall back to an external CDN,
// breaking the offline / no-external-request guarantee. Resolve against
// document.baseURI so it works under any deploy sub-path.
let sqlPromise: Promise<SqlJsStatic> | null = null;

function wasmUrl(): string {
  try {
    if (typeof document !== 'undefined' && document.baseURI) {
      return new URL('sql-wasm-browser.wasm', document.baseURI).href;
    }
  } catch {
    // fall through
  }
  return 'sql-wasm-browser.wasm';
}

export function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: wasmUrl });
  }
  return sqlPromise;
}
