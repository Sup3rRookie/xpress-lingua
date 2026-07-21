import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';
import type { SqlJsStatic } from 'sql.js';

// sql.js WASM loading (web). The .wasm binary matching the bundled JS is served
// from public/sql-wasm-browser.wasm by the Expo dev/prod web server, so the
// versions can never drift. sql.js.org is kept only as a last-resort fallback.
let sqlPromise: Promise<SqlJsStatic> | null = null;

export function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => '/sql-wasm-browser.wasm' }).catch(() => {
      sqlPromise = null;
      return initSqlJs({ locateFile: () => 'https://sql.js.org/dist/sql-wasm.wasm' });
    });
  }
  return sqlPromise;
}
