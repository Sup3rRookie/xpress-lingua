// sql.js ships a browser-only build (no Node require() calls) that Metro can
// bundle cleanly. Re-use the official types for it.
declare module 'sql.js/dist/sql-wasm-browser.js' {
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}
